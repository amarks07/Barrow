import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useIsFocused } from "@react-navigation/native";

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
//
// enabled={isFocused}: react-native-keyboard-controller drives its padding
// off a single global keyboard-height value, not one scoped per screen — so
// every wrapped screen reacts to the keyboard at once, including whichever
// tab sits hidden behind Day/Preferences/etc. while its field is focused.
// That hidden screen's own paddingBottom (inside its scene content, above
// where a tab bar renders as a sibling) still grows to match, invisibly.
// Backing out while that padding hasn't yet animated back to 0 briefly
// reveals it as blank space above the navbar. Disabling the view outright
// for any screen that isn't the focused route skips that padding entirely.
export function withKeyboardAvoiding(Component) {
  return function KeyboardAvoidingScreen(props) {
    const isFocused = useIsFocused();
    return (
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} enabled={isFocused}>
        <Component {...props} />
      </KeyboardAvoidingView>
    );
  };
}
