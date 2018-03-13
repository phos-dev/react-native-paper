/* @flow */

import * as React from 'react';
import {
  View,
  Animated,
  Easing,
  TouchableWithoutFeedback,
  SafeAreaView,
  StyleSheet,
  Platform,
} from 'react-native';
import color from 'color';
import Icon from './Icon';
import Paper from './Paper';
import Text from './Typography/Text';
import { black, white } from '../styles/colors';
import withTheme from '../core/withTheme';
import type { Theme } from '../types';
import type { IconSource } from './Icon';

const AnimatedText = Animated.createAnimatedComponent(Text);
const AnimatedPaper = Animated.createAnimatedComponent(Paper);

type Route = {
  key: string,
  title?: string,
  icon?: IconSource,
  color?: string,
};

type NavigationState<T> = {
  index: number,
  routes: Array<T>,
};

type Props<T> = {
  /**
   * Whether the shifting style is used, the active tab appears wider and the inactive tabs won't have a label.
   * By default, this is `true` when you have more than 3 tabs.
   */
  shifting?: boolean,
  /**
   * State for the bottom navigation. The state should contain the following properties:
   *
   * - `index`: a number reprsenting the index of the active route in the `routes` array
   * - `routes`: an array containing a list of route objects used for rendering the tabs
   *
   * Each route object should contain the following properties:
   *
   * - `key`: a unique key to identify the route
   * - `title`: title of the route to use as the tab label
   * - `icon`: icon to use as the tab icon, can be a string, an image source or a react component
   * - `color`: color to use as background color for shifting bottom navigation
   *
   * Example:
   *
   * ```js
   * {
   *   index: 1,
   *   routes: [
   *     { key: 'music', title: 'Music', icon: 'queue-music', color: '#3F51B5' },
   *     { key: 'albums', title: 'Albums', icon: 'album', color: '#009688' },
   *     { key: 'recents', title: 'Recents', icon: 'history', color: '#795548' },
   *     { key: 'purchased', title: 'Purchased', icon: 'shopping-cart', color: '#607D8B' },
   *   ]
   * }
   * ```
   *
   * `BottomNavigation` is a controlled component, which means the `index` needs to be updated via the `onIndexChange` callback.
   */
  navigationState: NavigationState<T>,
  /**
   * Callback which is called on tab change, receives the index of the new tab as argument.
   * The navigation state needs to be updated when it's called, otherwise the change is dropped.
   */
  onIndexChange: (index: number) => mixed,
  /**
   * Callback which returns a react element to render as the page for the tab. Receives an object containing the route as the argument:
   *
   * ```js
   * renderScene = ({ route, jumpTo }) => {
   *   switch (route.key) {
   *     case 'music':
   *       return <MusicRoute jumpTo={jumpTo} />;
   *     case 'albums':
   *       return <AlbumsRoute jumpTo={jumpTo} />;
   *   }
   * }
   * ```
   *
   * You need to make sure that your individual routes implement a `shouldComponentUpdate` to improve the performance.
   * To make it easier to specify the components, you can use the `SceneMap` helper:
   *
   * ```js
   * renderScene = BottomNavigation.SceneMap({
   *   music: MusicRoute,
   *   albums: AlbumsRoute,
   * });
   * ```
   *
   * Specifying the components this way is easier and takes care of implementing a `shouldComponentUpdate` method.
   * Each component will receive the current route and a `jumpTo` method as it's props.
   * The `jumpTo` method can be used to navigate to other tabs programmatically:
   *
   * ```js
   * this.props.jumpTo('albums')
   * ```
   */
  renderScene: (props: {
    route: T,
    focused: boolean,
    jumpTo: (key: string) => mixed,
  }) => ?React.Node,
  /**
   * Callback which returns a React Element to be used as tab icon.
   */
  renderIcon?: (props: {
    route: T,
    focused: boolean,
    tintColor: string,
  }) => React.Node,
  /**
   * Callback which React Element to be used as tab label.
   */
  renderLabel?: (props: {
    route: T,
    focused: boolean,
    tintColor: string,
  }) => React.Node,
  /**
   * Get label text for the tab, uses `route.title` by default. Use `renderLabel` to replace label component.
   */
  getLabelText?: (props: { route: T }) => string,
  /**
   * Get color for the tab, uses `route.color` by default.
   */
  getColor?: (props: { route: T }) => string,
  /**
   * Function to execute on tab press. It receives the route for the pressed tab, useful for things like scroll to top.
   */
  onTabPress?: (props: { route: T, focused: boolean }) => mixed,
  /**
   * Style for the bottom navigation bar.
   * You can set a bottom padding here if you have a translucent navigation bar on Android:
   *
   * ```js
   * barStyle={{ paddingBottom: 48 }}
   * ```
   */
  barStyle?: any,
  style?: any,
  /**
   * @optional
   */
  theme: Theme,
};

type State = {
  /**
   * Active state of individual tab items, active state is 1 and inactve state is 0.
   */
  tabs: Animated.Value[],
  /**
   * The amount of horizontal shift for each tab item.
   */
  shifts: Animated.Value[],
  /**
   * Index of the currently active tab. Used for setting the background color.
   * Use don't use the color as an animated value directly, because `setValue` seems to be buggy with colors.
   */
  index: Animated.Value,
  /**
   * Animation for the background color ripple, used to determine it's scale and opacity.
   */
  ripple: Animated.Value,
  /**
   * Animation for the touch feedback, used to determine it's scale and opacity.
   */
  touch: Animated.Value,
  /**
   * Layout of the tab bar. The width is used to determine the size and position of the ripple.
   */
  layout: { height: number, width: number, measured: boolean },
  /**
   * Previously active index. Used to determine the position of the ripple.
   */
  previous: number,
};

const MIN_RIPPLE_SCALE = 0.001; // Minimum scale is not 0 due to bug with animation
const MIN_SHIFT_AMOUNT = 10;
const MIN_TAB_WIDTH = 96;
const MAX_TAB_WIDTH = 168;
const BAR_HEIGHT = 56;
const SMALL_RIPPLE_SIZE = 96;
const ACTIVE_LABEL_SIZE = 14;
const INACTIVE_LABEL_SIZE = 12;

/**
 * Bottom navigation provides quick navigation between top-level views of an app with a bottom tab bar.
 * It is primarily designed for use on mobile.
 *
 * <div class="screenshots">
 *   <img class="medium" src="screenshots/bottom-navigation.gif" />
 * </div>
 *
 * ## Usage
 * ```js
 * import * as React from 'react';
 * import { BottomNavigation } from 'react-native-paper';
 *
 * export default class MyComponent extends React.Component {
 *   state = {
 *     index: 0,
 *     routes: [
 *       { key: 'music', title: 'Music', icon: 'queue-music' },
 *       { key: 'albums', title: 'Albums', icon: 'album' },
 *       { key: 'recents', title: 'Recents', icon: 'history' },
 *     ],
 *   };
 *
 *   _handleIndexChange = index => this.setState({ index });
 *
 *   _renderScene = BottomNavigation.SceneMap({
 *     music: MusicRoute,
 *     albums: AlbumsRoute,
 *     recents: RecentsRoute,
 *   });
 *
 *   render() {
 *     return (
 *       <BottomNavigation
 *         navigationState={this.state}
 *         onIndexChange={this._handleIndexChange}
 *         renderScene={this._renderScene}
 *       />
 *     );
 *   }
 * }
 * ```
 */
class BottomNavigation<T: Route> extends React.Component<Props<T>, State> {
  /**
   * Pure components are used to minmize re-rendering of the pages.
   * This drastically improves the animation performance.
   */
  static SceneMap(scenes: { [key: string]: Function }) {
    /* eslint-disable react/no-multi-comp */
    class SceneComponent extends React.PureComponent<*> {
      render() {
        return React.createElement(scenes[this.props.route.key], this.props);
      }
    }

    return ({ route, jumpTo }: *) => (
      <SceneComponent key={route.key} route={route} jumpTo={jumpTo} />
    );
  }

  constructor(props) {
    super(props);

    const { routes, index } = this.props.navigationState;

    this.state = {
      tabs: routes.map((_, i) => new Animated.Value(i === index ? 1 : 0)),
      shifts: routes.map(
        (_, i) =>
          new Animated.Value(this._calculateShift(index, i, routes.length))
      ),
      index: new Animated.Value(index),
      ripple: new Animated.Value(MIN_RIPPLE_SCALE),
      touch: new Animated.Value(MIN_RIPPLE_SCALE),
      layout: { height: 0, width: 0, measured: false },
      previous: 0,
    };
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.navigationState.index !== this.props.navigationState.index) {
      this.setState({
        previous: this.props.navigationState.index,
      });
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.navigationState.index === this.props.navigationState.index) {
      return;
    }

    const { routes, index } = this.props.navigationState;

    // Reset the ripple to avoid glitch if it's currently animating
    this.state.ripple.setValue(MIN_RIPPLE_SCALE);

    Animated.parallel([
      Animated.timing(this.state.ripple, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(100),
        Animated.parallel([
          ...routes.map((_, i) =>
            Animated.timing(this.state.tabs[i], {
              toValue: i === index ? 1 : 0,
              duration: 200,
              useNativeDriver: true,
            })
          ),
          ...routes.map((_, i) =>
            Animated.timing(this.state.shifts[i], {
              toValue: this._calculateShift(index, i, routes.length),
              duration: 200,
              easing: Easing.out(Easing.sin),
              useNativeDriver: true,
            })
          ),
        ]),
      ]),
    ]).start(() => {
      // Workaround a bug in native animations where this is reset after first animation
      this.state.tabs.map((tab, i) => tab.setValue(i === index ? 1 : 0));

      // Update the index to change bar's bacground color and then hide the ripple
      this.state.index.setValue(index);
      this.state.ripple.setValue(MIN_RIPPLE_SCALE);
    });
  }

  _calculateShift = (activeIndex, currentIndex, numberOfItems) => {
    if (activeIndex < currentIndex) {
      // If the new active tab comes before current tab, current tab will shift towards right
      return 2 * MIN_SHIFT_AMOUNT;
    }

    if (activeIndex > currentIndex) {
      // If the new active tab comes after current tab, current tab will shift towards left
      return -2 * MIN_SHIFT_AMOUNT;
    }

    if (activeIndex === currentIndex) {
      if (currentIndex === 0) {
        // If the current tab is the new active tab and its the first tab, it'll shift towards right
        return MIN_SHIFT_AMOUNT;
      }

      if (currentIndex === numberOfItems - 1) {
        // If the current tab is the new active tab and its the last tab, it'll shift towards left
        return -MIN_SHIFT_AMOUNT;
      }
    }

    // If the current tab is the new active tab and its somewhere in the middle, it won't shift
    return 0;
  };

  _handleLayout = e =>
    this.setState({
      layout: {
        height: e.nativeEvent.layout.height,
        width: e.nativeEvent.layout.width,
        measured: true,
      },
    });

  _handleTabPress = (index: number) => {
    const { navigationState } = this.props;

    this.state.touch.setValue(MIN_RIPPLE_SCALE);

    Animated.timing(this.state.touch, {
      toValue: 1,
      duration: 300,
      easing: Easing.in(Easing.sin),
      useNativeDriver: true,
    }).start();

    if (index !== navigationState.index) {
      this.props.onIndexChange(index);
    }

    if (this.props.onTabPress) {
      const route = navigationState.routes[index];
      this.props.onTabPress({
        route,
        focused: navigationState.index === index,
      });
    }
  };

  _jumpTo = (key: string) => {
    const index = this.props.navigationState.routes.findIndex(
      route => route.key === key
    );

    this.props.onIndexChange(index);
  };

  render() {
    const {
      navigationState,
      renderScene,
      renderIcon,
      renderLabel,
      getLabelText = ({ route }) => route.title,
      getColor = ({ route }) => route.color,
      barStyle,
      style,
      theme,
    } = this.props;
    const { layout } = this.state;
    const { routes } = navigationState;
    const { colors } = theme;

    const shifting =
      typeof this.props.shifting === 'boolean'
        ? this.props.shifting
        : routes.length > 3;

    const {
      backgroundColor: approxBackgroundColor = shifting
        ? colors.primary
        : theme.dark ? black : white,
    } =
      StyleSheet.flatten(barStyle) || {};

    const backgroundColor = shifting
      ? this.state.index.interpolate({
          inputRange: routes.map((_, i) => i),
          outputRange: routes.map(
            route => getColor({ route }) || approxBackgroundColor
          ),
        })
      : approxBackgroundColor;

    const isDark = !color(approxBackgroundColor).light();

    const textColor = isDark ? white : black;
    const activeColor = shifting ? textColor : colors.primary;
    const inactiveColor = shifting
      ? textColor
      : color(textColor)
          .alpha(0.5)
          .rgb()
          .string();

    const touchColor = color(textColor)
      .alpha(0.12)
      .rgb()
      .string();

    const maxTabWidth = routes.length > 3 ? MIN_TAB_WIDTH : MAX_TAB_WIDTH;
    const tabWidth = Math.min(
      // Account for horizontal padding around the items
      (layout.width - MIN_SHIFT_AMOUNT * 4) / routes.length,
      maxTabWidth
    );

    // Since we have a single ripple, we have to reposition it so that it appears to expand from active tab.
    // We need to move it from the left to the active tab and also account for how much that tab has shifted.

    return (
      <View
        style={[styles.container, style]}
        onLayout={this._handleLayout}
        pointerEvents={layout.measured ? 'auto' : 'none'}
      >
        <View style={[styles.content, { backgroundColor: colors.background }]}>
          {routes.map((route, index) => {
            const focused = this.state.tabs[index];
            const opacity = focused;
            const translateY = shifting
              ? focused.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [8, 8, 0],
                })
              : 0;

            return (
              <Animated.View
                key={route.key}
                pointerEvents={
                  navigationState.index === index ? 'auto' : 'none'
                }
                style={[
                  StyleSheet.absoluteFill,
                  { opacity, transform: [{ translateY }] },
                ]}
              >
                {renderScene({
                  route,
                  focused: navigationState.index === index,
                  jumpTo: this._jumpTo,
                })}
              </Animated.View>
            );
          })}
        </View>
        <AnimatedPaper style={[styles.bar, barStyle, { backgroundColor }]}>
          <SafeAreaView
            style={[styles.items, { maxWidth: maxTabWidth * routes.length }]}
          >
            {shifting ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.ripple,
                  {
                    // Set top and left values so that the ripple's center is same as the tab's center
                    top: BAR_HEIGHT / 2 - layout.width / 8,
                    left:
                      navigationState.index * tabWidth +
                      tabWidth / 2 -
                      layout.width / 8,
                    height: layout.width / 4,
                    width: layout.width / 4,
                    borderRadius: layout.width / 2,
                    backgroundColor: getColor({
                      route: routes[navigationState.index],
                    }),
                    transform: [
                      { translateX: this.state.shifts[navigationState.index] },
                      {
                        // Scale to twice the size  to ensure it covers the whole tab bar
                        scale: this.state.ripple.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 8],
                        }),
                      },
                    ],
                    opacity: this.state.ripple.interpolate({
                      inputRange: [0, MIN_RIPPLE_SCALE, 0.3, 1],
                      outputRange: [0, 0, 1, 1],
                    }),
                  },
                ]}
              />
            ) : null}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.ripple,
                {
                  // Set top and left values so that the ripple's center is same as the tab's center
                  top: BAR_HEIGHT / 2 - SMALL_RIPPLE_SIZE / 2,
                  left:
                    navigationState.index * tabWidth +
                    tabWidth / 2 -
                    SMALL_RIPPLE_SIZE / 2,
                  height: SMALL_RIPPLE_SIZE,
                  width: SMALL_RIPPLE_SIZE,
                  borderRadius: SMALL_RIPPLE_SIZE / 2,
                  backgroundColor: touchColor,
                  transform: [
                    {
                      translateX: shifting
                        ? this.state.shifts[navigationState.index]
                        : 0,
                    },
                    { scale: this.state.touch },
                  ],
                  opacity: this.state.touch.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 1, 0],
                  }),
                },
              ]}
            />
            {routes.map((route, index) => {
              const shift = this.state.shifts[index];
              const focused = this.state.tabs[index];

              // Since we can't animate font size with native driver, calculate the scale to emulate it.
              const scale = focused.interpolate({
                inputRange: [0, 1],
                outputRange: [
                  shifting ? 0.5 : INACTIVE_LABEL_SIZE / ACTIVE_LABEL_SIZE,
                  1,
                ],
              });

              // Move down the icon to account for no-label in shifting and smaller label in non-shifting.
              const translateY = focused.interpolate({
                inputRange: [0, 1],
                outputRange: [shifting ? 10 : 2, 0],
              });

              // Amount of shifting for the shifting bottom navigation.
              // This gives the illusion of the active tab getting bigger.
              // We don't animate the width directly since we can't use native driver.
              const translateX = shifting ? shift : 0;

              // We render the active icon and label on top of inactive ones and cross-fade them on change.
              // This trick gives the illusion that we are animating between active and inactive colors.
              // This is to ensure that we can use native driver, as colors cannot be animated with native driver.
              const inactiveOpacity = focused.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0],
              });
              const activeIconOpacity = shifting
                ? focused.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 1],
                  })
                : focused;
              const activeLabelOpacity = focused;
              const inactiveIconOpacity = inactiveOpacity;
              const inactiveLabelOpacity = inactiveOpacity;

              return (
                <TouchableWithoutFeedback
                  key={route.key}
                  onPress={() => this._handleTabPress(index)}
                >
                  <Animated.View
                    style={[styles.item, { transform: [{ translateX }] }]}
                  >
                    <Animated.View
                      style={[
                        styles.iconContainer,
                        { transform: [{ translateY }] },
                      ]}
                    >
                      <Animated.View
                        style={[
                          styles.iconWrapper,
                          { opacity: activeIconOpacity },
                        ]}
                      >
                        {renderIcon ? (
                          renderIcon({
                            route,
                            focused: true,
                            tintColor: activeColor,
                          })
                        ) : (
                          <Icon
                            style={styles.icon}
                            name={route.icon}
                            color={activeColor}
                            size={24}
                          />
                        )}
                      </Animated.View>
                      {shifting ? null : (
                        <Animated.View
                          style={[
                            styles.iconWrapper,
                            { opacity: inactiveIconOpacity },
                          ]}
                        >
                          {renderIcon ? (
                            renderIcon({
                              route,
                              focused: false,
                              tintColor: inactiveColor,
                            })
                          ) : (
                            <Icon
                              style={styles.icon}
                              name={route.icon}
                              color={inactiveColor}
                              size={24}
                            />
                          )}
                        </Animated.View>
                      )}
                    </Animated.View>
                    <Animated.View
                      style={[
                        styles.labelContainer,
                        {
                          transform: [{ scale }, { translateY }],
                        },
                      ]}
                    >
                      <Animated.View
                        style={[
                          styles.labelWrapper,
                          { opacity: activeLabelOpacity },
                        ]}
                      >
                        {renderLabel ? (
                          renderLabel({
                            route,
                            focused: true,
                            tintColor: activeColor,
                          })
                        ) : (
                          <AnimatedText
                            style={[
                              styles.label,
                              {
                                color: activeColor,
                              },
                            ]}
                          >
                            {getLabelText({ route })}
                          </AnimatedText>
                        )}
                      </Animated.View>
                      {shifting ? null : (
                        <Animated.View
                          style={[
                            styles.labelWrapper,
                            { opacity: inactiveLabelOpacity },
                          ]}
                        >
                          {renderLabel ? (
                            renderLabel({
                              route,
                              focused: false,
                              tintColor: inactiveColor,
                            })
                          ) : (
                            <AnimatedText
                              style={[
                                styles.label,
                                {
                                  color: inactiveColor,
                                },
                              ]}
                            >
                              {getLabelText({ route })}
                            </AnimatedText>
                          )}
                        </Animated.View>
                      )}
                    </Animated.View>
                  </Animated.View>
                </TouchableWithoutFeedback>
              );
            })}
          </SafeAreaView>
        </AnimatedPaper>
      </View>
    );
  }
}

export default withTheme(BottomNavigation);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  bar: {
    elevation: 8,
    overflow: 'hidden',
    alignItems: 'center',
    paddingHorizontal: MIN_SHIFT_AMOUNT * 2,
  },
  items: {
    flexDirection: 'row',
  },
  item: {
    flex: 1,
    // Top adding is 6 and bottom padding is 10
    // The extra 4dp bottom padding is offset by label's height
    paddingVertical: 6,
  },
  ripple: {
    position: 'absolute',
  },
  iconContainer: {
    height: 24,
    width: 24,
    marginHorizontal: 12,
    alignSelf: 'center',
  },
  iconWrapper: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
  },
  icon: {
    backgroundColor: 'transparent',
  },
  labelContainer: {
    height: 18,
    marginTop: 2,
    paddingBottom: 4,
  },
  labelWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  label: {
    fontSize: Platform.OS === 'ios' ? 13 : 14,
    textAlign: 'center',
    backgroundColor: 'transparent',
  },
});