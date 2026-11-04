import { useHeaderHeight } from "expo-router/react-navigation";
import { Platform } from "react-native";

/**
 * Top padding that keeps a screen's content below the native stack header.
 *
 * On iOS 26+ react-native-screens lays screens out under the navigation bar
 * (4.30.0), so content at the top of a screen that is not in a scroll view
 * (like the game status bar) needs the header's height. On older iOS and on
 * Android the screen still starts below the header.
 */
export function useHeaderInset() {
  const headerHeight = useHeaderHeight();
  const underHeader =
    Platform.OS === "ios" && parseInt(String(Platform.Version), 10) >= 26;
  return underHeader ? headerHeight : 0;
}
