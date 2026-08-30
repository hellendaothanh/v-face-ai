import 'package:flutter_test/flutter_test.dart';
import 'package:v_face_mobile/app.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const VFaceApp());
    expect(find.byType(VFaceApp), findsOneWidget);
  });
}
