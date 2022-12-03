import * as React from 'react';
import { StyleSheet } from 'react-native';

import color from 'color';
import renderer from 'react-test-renderer';

import { getTheme } from '../../core/theming';
import { red500 } from '../../styles/themes/v2/colors';
import ListAccordion from '../List/ListAccordion.tsx';
import ListIcon from '../List/ListIcon.tsx';
import ListItem from '../List/ListItem.tsx';
import { getAccordionColors } from '../List/utils';

const styles = StyleSheet.create({
  coloring: {
    color: red500,
  },
});

it('renders list accordion item with title as a component', () => {
  const Component = () => <span>adasdas</span>;
  const tree = renderer
    .create(
      <ListAccordion
        left={(props) => <ListIcon {...props} icon="folder" />}
        title="Expandable list item"
      >
        <ListItem title={<Component />} />
      </ListAccordion>
    )
    .toJSON();

  expect(tree).toMatchSnapshot();
});

it('renders list accordion with children', () => {
  const tree = renderer
    .create(
      <ListAccordion
        left={(props) => <ListIcon {...props} icon="folder" />}
        title="Expandable list item"
      >
        <ListItem title="First Item" />
      </ListAccordion>
    )
    .toJSON();

  expect(tree).toMatchSnapshot();
});

it('renders multiline list accordion', () => {
  const tree = renderer
    .create(
      <ListAccordion
        title="Expandable list item"
        description="Describes the expandable list item"
      >
        <ListItem title="List item 1" />
      </ListAccordion>
    )
    .toJSON();

  expect(tree).toMatchSnapshot();
});

it('renders list accordion with left items', () => {
  const tree = renderer
    .create(
      <ListAccordion
        left={(props) => <ListIcon {...props} icon="star" />}
        title="Accordion item 1"
      >
        <ListItem
          left={(props) => <ListIcon {...props} icon="thumb-up" />}
          title="List item 1"
        />
      </ListAccordion>
    )
    .toJSON();

  expect(tree).toMatchSnapshot();
});

it('renders expanded accordion', () => {
  const tree = renderer
    .create(
      <ListAccordion title="Accordion item 1" expanded>
        <ListItem title="List item 1" />
      </ListAccordion>
    )
    .toJSON();

  expect(tree).toMatchSnapshot();
});

it('renders list accordion with custom title and description styles', () => {
  const tree = renderer
    .create(
      <ListAccordion
        title="Accordion item 1"
        description="Describes the expandable list item"
        titleStyle={styles.coloring}
        descriptionStyle={styles.coloring}
      >
        <ListItem title="List item 1" />
      </ListAccordion>
    )
    .toJSON();

  expect(tree).toMatchSnapshot();
});

describe('getAccordionColors - title color', () => {
  it('should return theme color, for theme version 3', () => {
    expect(
      getAccordionColors({
        theme: getTheme(),
      })
    ).toMatchObject({
      titleColor: getTheme().colors.onSurface,
    });
  });

  it('should return theme color, for theme version 2', () => {
    expect(
      getAccordionColors({
        theme: getTheme(false, false),
      })
    ).toMatchObject({
      titleColor: color(getTheme(false, false).colors.text)
        .alpha(0.87)
        .rgb()
        .string(),
    });
  });
});

describe('getAccordionColors - description color', () => {
  it('should return theme color, for theme version 3', () => {
    expect(
      getAccordionColors({
        theme: getTheme(),
      })
    ).toMatchObject({
      descriptionColor: getTheme().colors.onSurfaceVariant,
    });
  });

  it('should return theme color, for theme version 2', () => {
    expect(
      getAccordionColors({
        theme: getTheme(false, false),
      })
    ).toMatchObject({
      descriptionColor: color(getTheme(false, false).colors.text)
        .alpha(0.54)
        .rgb()
        .string(),
    });
  });
});

describe('getAccordionColors - title text color', () => {
  it('should return theme color, for theme version 3', () => {
    expect(
      getAccordionColors({
        theme: getTheme(),
      })
    ).toMatchObject({
      titleTextColor: getTheme().colors.onSurface,
    });
  });

  it('should return theme color, for theme version 2', () => {
    expect(
      getAccordionColors({
        theme: getTheme(false, false),
      })
    ).toMatchObject({
      titleTextColor: color(getTheme(false, false).colors.text)
        .alpha(0.87)
        .rgb()
        .string(),
    });
  });

  it('should return primary color if it is expanded', () => {
    expect(
      getAccordionColors({
        theme: getTheme(),
        isExpanded: true,
      })
    ).toMatchObject({
      titleTextColor: getTheme().colors?.primary,
    });
  });
});

describe('getAccordionColors - ripple color', () => {
  it('should return theme color, for theme version 3', () => {
    expect(
      getAccordionColors({
        theme: getTheme(),
      })
    ).toMatchObject({
      rippleColor: color(getTheme().colors.onSurface)
        .alpha(0.12)
        .rgb()
        .string(),
    });
  });

  it('should return theme color, for theme version 2', () => {
    const v2TextColor = color(getTheme(false, false).colors.text)
      .alpha(0.87)
      .rgb()
      .string();

    expect(
      getAccordionColors({
        theme: getTheme(false, false),
      })
    ).toMatchObject({
      rippleColor: color(v2TextColor).alpha(0.12).rgb().string(),
    });
  });

  it('should return primary color if it is expanded', () => {
    expect(
      getAccordionColors({
        theme: getTheme(),
        isExpanded: true,
      })
    ).toMatchObject({
      rippleColor: color(getTheme().colors.primary).alpha(0.12).rgb().string(),
    });
  });
});
