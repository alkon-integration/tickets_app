const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const FUNCTION_NAME = 'tickets-app-backend';
const REGION = process.env.AWS_REGION || 'sa-east-1';
const AWS_PROFILE = process.env.AWS_PROFILE || '';
const ROLE_NAME = `${FUNCTION_NAME}-role`;

console.log('='.repeat(60));
console.log('Starting deployment to AWS Lambda...');
console.log(`Function Name: ${FUNCTION_NAME}`);
console.log(`Region: ${REGION}`);
console.log(`AWS Profile: ${AWS_PROFILE || 'default'}`);
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log('='.repeat(60));

async function createZipFile() {
  console.log('\n📦 Creating deployment package...');
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream('lambda-deployment.zip');
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      const sizeInMB = (archive.pointer() / (1024 * 1024)).toFixed(2);
      console.log(`✅ Created deployment package: ${archive.pointer()} bytes (${sizeInMB} MB)`);
      resolve();
    });

    archive.on('error', (err) => {
      console.error('❌ Error creating deployment package:', err);
      reject(err);
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('⚠️  Warning:', err);
      } else {
        reject(err);
      }
    });

    archive.pipe(output);

    console.log('   Adding files to archive:');
    console.log('   - lambda.js');
    archive.file('lambda.js', { name: 'lambda.js' });
    console.log('   - api/ directory');
    archive.directory('api/', 'api');
    console.log('   - node_modules/ directory');
    archive.directory('node_modules/', 'node_modules');
    console.log('   - package.json');
    archive.file('package.json', { name: 'package.json' });

    archive.finalize();
  });
}

function executeCommand(command, errorMessage) {
  // Add AWS profile to command if specified
  const profileFlag = AWS_PROFILE ? ` --profile ${AWS_PROFILE}` : '';
  const fullCommand = command.includes('--region') ? command.replace('--region', `${profileFlag} --region`) : `${command}${profileFlag}`;

  console.log(`   Executing: ${fullCommand.substring(0, 80)}${fullCommand.length > 80 ? '...' : ''}`);
  try {
    const result = execSync(fullCommand, { encoding: 'utf-8', stdio: 'pipe' });
    console.log(`   ✅ Success: ${errorMessage || 'Command executed'}`);
    return result.trim();
  } catch (error) {
    if (error.status === 254 || error.status === 255 || errorMessage.includes('already exists')) {
      console.log(`   ℹ️  Info: ${errorMessage} (status: ${error.status})`);
      return null;
    }
    console.error(`   ❌ Error: ${errorMessage}`);
    console.error(`   Details: ${error.stderr || error.message}`);
    return null;
  }
}

function createIAMRole() {
  console.log('\n🔐 Checking IAM role...');
  console.log(`   Role Name: ${ROLE_NAME}`);

  const trustPolicy = {
    Version: '2012-10-17',
    Statement: [{
      Effect: 'Allow',
      Principal: { Service: 'lambda.amazonaws.com' },
      Action: 'sts:AssumeRole'
    }]
  };

  const trustPolicyJson = JSON.stringify(trustPolicy).replace(/"/g, '\\"');

  console.log('   Creating IAM role (if not exists)...');
  executeCommand(
    `aws iam create-role --role-name ${ROLE_NAME} --assume-role-policy-document "${trustPolicyJson}" --region ${REGION}`,
    'Role might already exist'
  );

  console.log('   Attaching Lambda execution policy...');
  executeCommand(
    `aws iam attach-role-policy --role-name ${ROLE_NAME} --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole --region ${REGION}`,
    'Policy might already be attached'
  );

  console.log('   ⏳ Waiting for IAM role to propagate (10 seconds)...');
  execSync('sleep 10');

  console.log('   Fetching Role ARN...');
  const roleArn = executeCommand(
    `aws iam get-role --role-name ${ROLE_NAME} --query 'Role.Arn' --output text --region ${REGION}`,
    'Failed to get role ARN'
  );

  if (roleArn) {
    console.log(`   ✅ Role ARN: ${roleArn}`);
  }

  return roleArn;
}

async function deployLambda(roleArn) {
  console.log('\n🚀 Deploying Lambda function...');
  console.log(`   Function Name: ${FUNCTION_NAME}`);
  console.log(`   Using Role ARN: ${roleArn}`);

  await createZipFile();

  console.log('   Checking if Lambda function exists...');
  const functionExists = executeCommand(
    `aws lambda get-function --function-name ${FUNCTION_NAME} --region ${REGION} 2>&1`,
    'Checking if function exists'
  );

  if (functionExists && !functionExists.includes('ResourceNotFoundException')) {
    console.log('   📝 Function exists - updating code...');
    const updateResult = executeCommand(
      `aws lambda update-function-code --function-name ${FUNCTION_NAME} --zip-file fileb://lambda-deployment.zip --region ${REGION}`,
      'Failed to update Lambda function'
    );
    if (updateResult) {
      console.log('   ✅ Lambda function code updated successfully');
    }
  } else {
    console.log('   ✨ Function does not exist - creating new function...');
    console.log('   Configuration:');
    console.log('      - Runtime: nodejs18.x');
    console.log('      - Handler: lambda.handler');
    console.log('      - Timeout: 30 seconds');
    console.log('      - Memory: 512 MB');
    const createResult = executeCommand(
      `aws lambda create-function --function-name ${FUNCTION_NAME} --runtime nodejs18.x --role ${roleArn} --handler lambda.handler --zip-file fileb://lambda-deployment.zip --timeout 30 --memory-size 512 --region ${REGION}`,
      'Failed to create Lambda function'
    );
    if (createResult) {
      console.log('   ✅ Lambda function created successfully');
    }
  }

  console.log('   ⏳ Waiting for function to be ready (5 seconds)...');
  execSync('sleep 5');
  console.log('   ✅ Function deployment complete');
}

function createFunctionUrl() {
  console.log('\n🌐 Configuring Function URL...');

  console.log('   Checking if Function URL already exists...');
  const urlConfig = executeCommand(
    `aws lambda get-function-url-config --function-name ${FUNCTION_NAME} --region ${REGION} 2>&1`,
    'Checking if Function URL exists'
  );

  if (!urlConfig || urlConfig.includes('ResourceNotFoundException')) {
    console.log('   ✨ Function URL does not exist - creating...');
    console.log('   CORS Configuration: AllowOrigins=*, AllowMethods=*, AllowHeaders=*');
    const createUrlResult = executeCommand(
      `aws lambda create-function-url-config --function-name ${FUNCTION_NAME} --auth-type NONE --cors "AllowOrigins=*,AllowMethods=*,AllowHeaders=*" --region ${REGION}`,
      'Failed to create Function URL'
    );
    if (createUrlResult) {
      console.log('   ✅ Function URL created');
    }

    console.log('   Adding public access permission...');
    const permissionResult = executeCommand(
      `aws lambda add-permission --function-name ${FUNCTION_NAME} --statement-id FunctionURLAllowPublicAccess --action lambda:InvokeFunctionUrl --principal "*" --function-url-auth-type NONE --region ${REGION}`,
      'Failed to add public access permission'
    );
    if (permissionResult) {
      console.log('   ✅ Public access permission added');
    }
  } else {
    console.log('   ℹ️  Function URL already exists');
  }

  console.log('   Fetching Function URL...');
  const functionUrl = executeCommand(
    `aws lambda get-function-url-config --function-name ${FUNCTION_NAME} --query 'FunctionUrl' --output text --region ${REGION}`,
    'Failed to get Function URL'
  );

  if (functionUrl) {
    console.log(`   ✅ Function URL: ${functionUrl}`);
  }

  return functionUrl;
}

async function main() {
  const startTime = Date.now();

  try {
    console.log('\n' + '='.repeat(60));
    console.log('STEP 1/3: IAM Role Configuration');
    console.log('='.repeat(60));
    const roleArn = createIAMRole();
    if (!roleArn) {
      console.error('\n❌ Failed to create or get IAM role');
      console.error('   Please check your AWS credentials and permissions');
      process.exit(1);
    }

    console.log('\n' + '='.repeat(60));
    console.log('STEP 2/3: Lambda Function Deployment');
    console.log('='.repeat(60));
    await deployLambda(roleArn);

    console.log('\n' + '='.repeat(60));
    console.log('STEP 3/3: Function URL Configuration');
    console.log('='.repeat(60));
    const functionUrl = createFunctionUrl();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log('✅ DEPLOYMENT SUCCESSFUL!');
    console.log('='.repeat(60));
    console.log(`\n📊 Deployment Summary:`);
    console.log(`   Function Name: ${FUNCTION_NAME}`);
    console.log(`   Region: ${REGION}`);
    console.log(`   Profile: ${AWS_PROFILE || 'default'}`);
    console.log(`   Duration: ${duration} seconds`);
    console.log(`   Function URL: ${functionUrl}`);

    console.log(`\n🧪 Test your API:`);
    console.log(`   Login endpoint:`);
    console.log(`   curl -X POST ${functionUrl}api/auth/login -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"test123"}'`);

    console.log('\n🧹 Cleaning up deployment package...');
    fs.unlinkSync('lambda-deployment.zip');
    console.log('   ✅ Cleanup complete');

    console.log('\n' + '='.repeat(60));
  } catch (error) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.error('\n' + '='.repeat(60));
    console.error('❌ DEPLOYMENT FAILED!');
    console.error('='.repeat(60));
    console.error(`\n📊 Deployment Info:`);
    console.error(`   Function Name: ${FUNCTION_NAME}`);
    console.error(`   Region: ${REGION}`);
    console.error(`   Profile: ${AWS_PROFILE || 'default'}`);
    console.error(`   Duration: ${duration} seconds`);
    console.error(`\n💥 Error Details:`);
    console.error(`   ${error.message || error}`);
    if (error.stack) {
      console.error(`\n📚 Stack Trace:`);
      console.error(error.stack);
    }
    console.error('\n' + '='.repeat(60));

    // Attempt cleanup
    try {
      if (fs.existsSync('lambda-deployment.zip')) {
        fs.unlinkSync('lambda-deployment.zip');
        console.error('🧹 Cleaned up deployment package');
      }
    } catch (cleanupError) {
      console.error('⚠️  Could not clean up deployment package');
    }

    process.exit(1);
  }
}

main();
