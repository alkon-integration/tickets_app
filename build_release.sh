#!/bin/bash

# Script para construir la app en modo release
# Este script construye el App Bundle (AAB) listo para Play Store

echo "=================================================="
echo "Unicon Tickets - Build Release"
echo "=================================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -f "pubspec.yaml" ]; then
    echo -e "${RED}❌ Error: Este script debe ejecutarse desde la raíz del proyecto Flutter${NC}"
    exit 1
fi

# Verificar que existe key.properties
if [ ! -f "android/key.properties" ]; then
    echo -e "${YELLOW}⚠️  Advertencia: No se encontró android/key.properties${NC}"
    echo ""
    echo "Debe crear este archivo con la siguiente estructura:"
    echo ""
    echo "storePassword=SU_CONTRASEÑA"
    echo "keyPassword=SU_CONTRASEÑA_CLAVE"
    echo "keyAlias=SU_ALIAS"
    echo "storeFile=nombre-keystore.jks"
    echo ""
    read -p "¿Desea continuar de todas formas? (y/N): " response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Abortando..."
        exit 1
    fi
fi

echo "🧹 Limpiando proyecto..."
flutter clean

echo ""
echo "📦 Obteniendo dependencias..."
flutter pub get

echo ""
echo "🔍 Analizando proyecto..."
flutter analyze

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Se encontraron problemas en el análisis${NC}"
    read -p "¿Desea continuar de todas formas? (y/N): " response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Abortando..."
        exit 1
    fi
fi

echo ""
echo "=================================================="
echo "Seleccione el tipo de build:"
echo "=================================================="
echo "1) App Bundle (AAB) - Recomendado para Play Store"
echo "2) APK - Para pruebas o distribución directa"
echo "3) Ambos"
echo ""
read -p "Opción (1-3): " build_option

case $build_option in
    1)
        echo ""
        echo "🏗️  Construyendo App Bundle (AAB)..."
        flutter build appbundle --release

        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${GREEN}✅ App Bundle construido exitosamente!${NC}"
            echo ""
            echo "📁 Archivo generado:"
            ls -lh build/app/outputs/bundle/release/app-release.aab
            echo ""
            echo "📍 Ubicación:"
            echo "   build/app/outputs/bundle/release/app-release.aab"
        else
            echo -e "${RED}❌ Error al construir App Bundle${NC}"
            exit 1
        fi
        ;;
    2)
        echo ""
        echo "🏗️  Construyendo APK..."
        flutter build apk --release

        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${GREEN}✅ APK construido exitosamente!${NC}"
            echo ""
            echo "📁 Archivo generado:"
            ls -lh build/app/outputs/flutter-apk/app-release.apk
            echo ""
            echo "📍 Ubicación:"
            echo "   build/app/outputs/flutter-apk/app-release.apk"
        else
            echo -e "${RED}❌ Error al construir APK${NC}"
            exit 1
        fi
        ;;
    3)
        echo ""
        echo "🏗️  Construyendo App Bundle (AAB)..."
        flutter build appbundle --release

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ App Bundle construido exitosamente!${NC}"
        else
            echo -e "${RED}❌ Error al construir App Bundle${NC}"
            exit 1
        fi

        echo ""
        echo "🏗️  Construyendo APK..."
        flutter build apk --release

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ APK construido exitosamente!${NC}"
            echo ""
            echo "📁 Archivos generados:"
            ls -lh build/app/outputs/bundle/release/app-release.aab
            ls -lh build/app/outputs/flutter-apk/app-release.apk
            echo ""
            echo "📍 Ubicaciones:"
            echo "   AAB: build/app/outputs/bundle/release/app-release.aab"
            echo "   APK: build/app/outputs/flutter-apk/app-release.apk"
        else
            echo -e "${RED}❌ Error al construir APK${NC}"
            exit 1
        fi
        ;;
    *)
        echo -e "${RED}❌ Opción inválida${NC}"
        exit 1
        ;;
esac

echo ""
echo "=================================================="
echo "✅ Build completado!"
echo "=================================================="
echo ""
echo "📋 Próximos pasos:"
echo "1. Verifique el archivo generado"
echo "2. Pruebe la instalación en un dispositivo"
echo "3. Suba el archivo a Google Play Console"
echo ""
echo "Para más información, consulte: DEPLOY_PLAY_STORE.md"
echo "=================================================="
