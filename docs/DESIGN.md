---
name: "美股放大鏡"
description: "Design tokens extracted from https://www.forecastock.tw/"
colors:
  primary: "#0B8BE3"
  secondary: "#F9F9F9"
  tertiary: "#FF635B"
  surface: "#FFB43B"
  on-surface: "#262626"
typography:
  text-1:
    fontFamily: "apple-system"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.5
  text-2:
    fontFamily: "apple-system"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.5
  text-3:
    fontFamily: "apple-system"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.5
  text-4:
    fontFamily: "apple-system"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.5
  text-5:
    fontFamily: "apple-system"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.5
  text-6:
    fontFamily: "apple-system"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.5
  text-7:
    fontFamily: "apple-system"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  text-8:
    fontFamily: "apple-system"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  text-9:
    fontFamily: "apple-system"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.5
  text-10:
    fontFamily: "apple-system"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.5
  text-11:
    fontFamily: "apple-system"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.5
  text-12:
    fontFamily: "apple-system"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  text-13:
    fontFamily: "apple-system"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  text-14:
    fontFamily: "apple-system"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  text-15:
    fontFamily: "apple-system"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  text-16:
    fontFamily: "apple-system"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.5
  text-17:
    fontFamily: "-apple-system"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  text-18:
    fontFamily: "apple-system"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.5
  text-19:
    fontFamily: "apple-system"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.5
  text-20:
    fontFamily: "apple-system"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  text-21:
    fontFamily: "apple-system"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.5
  text-22:
    fontFamily: "-apple-system"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.43
  text-23:
    fontFamily: "-apple-system"
    fontSize: "12px"
    fontWeight: 900
    lineHeight: 1.67
  text-24:
    fontFamily: "-apple-system"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.67
  text-25:
    fontFamily: "-apple-system"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.33
  text-26:
    fontFamily: "apple-system"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.67
  text-27:
    fontFamily: "apple-system"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.67
  text-28:
    fontFamily: "apple-system"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  text-29:
    fontFamily: "apple-system"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.5
  text-30:
    fontFamily: "-apple-system"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.33
  text-31:
    fontFamily: "-apple-system"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.33
spacing:
  base: "8px"
  xs: "2px"
  sm: "3.5px"
  md: "4px"
  lg: "5px"
  xl: "6px"
  xxl: "8px"
  xxxl: "9px"
  xxxxl: "10px"
rounded:
  sm: "3px"
  md: "4px"
  lg: "7px"
  xl: "8px"
  full: "9999px"
components:
  button-observed:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  input-observed:
    backgroundColor: "#F5F5F5"
    textColor: "#595959"
    rounded: "0px"
    padding: "0px"
---

# Design System

## Overview
Design tokens extracted from forecastock.tw. The YAML front matter contains machine-readable values observed by Dembrandt when available; the sections below summarize the extracted evidence without redesigning or correcting the source site.

## Colors
- **Primary** (#0B8BE3): Observed color token extracted from the site's palette, semantic CSS, or component styles.
- **Secondary** (#F9F9F9): Observed color token extracted from the site's palette, semantic CSS, or component styles.
- **Tertiary** (#FF635B): Observed color token extracted from the site's palette, semantic CSS, or component styles.
- **Surface** (#FFB43B): Observed color token extracted from the site's palette, semantic CSS, or component styles.
- **On Surface** (#262626): Observed color token extracted from the site's palette, semantic CSS, or component styles.

## Typography
- **Text 1**: apple-system, 24px, semi-bold
- **Text 2**: apple-system, 24px, semi-bold
- **Text 3**: apple-system, 22px, semi-bold
- **Text 4**: apple-system, 22px, semi-bold
- **Text 5**: apple-system, 20px, semi-bold
- **Text 6**: apple-system, 20px, semi-bold

## Layout
Observed spacing scale: 8px spacing scale.
- **Spacing tokens**: base 8px, xs 2px, sm 3.5px, md 4px, lg 5px, xl 6px, xxl 8px, xxxl 9px, xxxxl 10px
- **Responsive breakpoints**: 0px, 9px, 500px, 576px, 767px, 1023px

## Elevation & Depth
Observed box-shadow styles: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(38, 38, 38, 0.2) 0px 0px 2px 0px, rgba(38, 38, 38, 0.1) 0px 2px 10px 0px; rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(38, 38, 38, 0.2) 0px 0px 1px 0px, rgba(38, 38, 38, 0.2) 0px 26px 80px 0px

## Shapes
Observed rounded-corner tokens: sm 3px, md 4px, lg 7px, xl 8px, full 9999px.

## Components
- **Buttons**: Observed sample with radius 4px, background #0B8BE3, text #FFFFFF, padding 8px 16px, border 0px solid rgb(229, 231, 235)
- **Inputs**: Observed sample with 0px solid border, 0px radius
