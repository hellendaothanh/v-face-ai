import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'core/localization/app_localizations.dart';
import 'core/theme/app_theme.dart';
import 'data/repositories/auth_repository.dart';
import 'presentation/blocs/auth/auth_bloc.dart';
import 'presentation/blocs/language/language_cubit.dart';
import 'presentation/screens/splash_screen.dart';

class VFaceApp extends StatelessWidget {
  const VFaceApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiRepositoryProvider(
      providers: [
        RepositoryProvider<AuthRepository>(create: (_) => AuthRepository()),
      ],
      child: MultiBlocProvider(
        providers: [
          BlocProvider<AuthBloc>(
            create: (context) => AuthBloc(
              authRepository: context.read<AuthRepository>(),
            ),
          ),
          BlocProvider<LanguageCubit>(
            create: (_) => LanguageCubit(),
          ),
        ],
        child: BlocBuilder<LanguageCubit, Locale>(
          builder: (context, currentLocale) {
            return MaterialApp(
              title: "V-Face Mobile",
              debugShowCheckedModeBanner: false,
              locale: currentLocale,
              theme: AppTheme.lightTheme,
              darkTheme: AppTheme.darkTheme,
              themeMode: ThemeMode.dark, // Default modern Dark Mode
              localizationsDelegates: const [
                AppLocalizations.delegate,
                GlobalMaterialLocalizations.delegate,
                GlobalWidgetsLocalizations.delegate,
                GlobalCupertinoLocalizations.delegate,
              ],
              supportedLocales: const [
                Locale('vi', 'VN'),
                Locale('en', 'US'),
              ],
              home: const SplashScreen(),
            );
          },
        ),
      ),
    );
  }
}
