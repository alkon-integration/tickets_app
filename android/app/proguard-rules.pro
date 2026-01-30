# Flutter wrapper
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.**  { *; }
-keep class io.flutter.util.**  { *; }
-keep class io.flutter.view.**  { *; }
-keep class io.flutter.**  { *; }
-keep class io.flutter.plugins.**  { *; }

# Keep native methods
-keepclassmembers class * {
    native <methods>;
}

# Keep custom application class
-keep public class * extends android.app.Application

# SharedPreferences
-keep class androidx.preference.** { *; }
-keep class * extends androidx.preference.PreferenceFragmentCompat { *; }

# Google Play Core (optional - ignore if not used)
-dontwarn com.google.android.play.core.**
-keep class com.google.android.play.core.** { *; }
