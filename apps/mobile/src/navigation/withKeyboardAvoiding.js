import { KeyboardAvoidingView } from "react-native-keyboard-controller";

// Each React Navigation screen (native-stack or tab) is its own native view
// controller, so a single KeyboardAvoidingView wrapping the whole app
// doesn't reach into them — it has to be applied per screen. Uses
// react-native-keyboard-controller's KeyboardAvoidingView rather than core
// RN's: core RN's Android implementation infers the keyboard from the
// window-resize that windowSoftInputMode="adjustResize" used to trigger,
// which edge-to-edge (mandatory since Expo SDK 54) no longer does, so it
// silently no-ops there. This one reads real keyboard-inset callbacks
// instead and works on both platforms. Wrapping the route component once
// here, at the navigator, avoids repeating it in every screen file.
export function withKeyboardAvoiding(Component) {
  return function KeyboardAvoidingScreen(props) {
    return (
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <Component {...props} />
      </KeyboardAvoidingView>
    );
  };
}
