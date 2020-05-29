import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Select } from 'antd'

import { CustomSelectProps } from '../types'
import {
  getCronValueFromNumbers,
  itemMaxNumber,
  itemStartAt,
  classNames,
  getTransformedStringFromNumber,
} from '../utils'
import { DEFAULT_LOCALE_EN } from '../locale'

export default function CustomSelect(props: CustomSelectProps) {
  const {
    value,
    nbOptions,
    grid = true,
    startAtZero = true,
    type,
    optionsList,
    setValue,
    locale,
    className,
    humanizeLabels,
    disabled,
    readOnly,
    leadingZero,
    clockFormat,
    period,
    ...otherProps
  } = props

  const [open, setOpen] = useState(false)

  const stringValue = useMemo(() => {
    if (value && Array.isArray(value)) {
      return value.map((value: number) => value.toString())
    }
  }, [value])

  useEffect(() => {
    Array.from(
      document.getElementsByClassName('ant-select-selection-search-input')
    ).forEach((element: Element) => {
      element.setAttribute('readonly', 'readonly')
    })
  }, [])

  const options = useMemo(() => {
    if (optionsList) {
      return optionsList.map((option, index) => {
        const number = startAtZero ? index : index + 1

        return {
          value: number.toString(),
          label: option,
        }
      })
    }

    return [...Array(nbOptions)].map((e, index) => {
      const number = startAtZero ? index : index + 1

      return {
        value: number.toString(),
        label: getTransformedStringFromNumber(
          number,
          type,
          humanizeLabels,
          leadingZero,
          clockFormat
        ),
      }
    })
  }, [
    optionsList,
    nbOptions,
    startAtZero,
    type,
    leadingZero,
    humanizeLabels,
    clockFormat,
  ])

  const localeJSON = JSON.stringify(locale)
  const renderTag = useCallback(
    (props) => {
      const { value: itemValue } = props

      if (!value || value[0] !== Number(itemValue)) {
        return <></>
      }

      const cronValue = getCronValueFromNumbers(
        value,
        type,
        humanizeLabels,
        leadingZero,
        clockFormat
      )
      const testEveryValue = cronValue.match(/^\*\/([0-9]+),?/) || []

      return (
        <div>
          {testEveryValue[1]
            ? `${locale.everyText || DEFAULT_LOCALE_EN.everyText} ${
                testEveryValue[1]
              }`
            : cronValue}
        </div>
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, type, localeJSON, humanizeLabels, leadingZero, clockFormat]
  )

  const onClick = useCallback(() => {
    setOpen(true)
  }, [])

  const onBlur = useCallback(() => {
    setOpen(false)
  }, [])

  const simpleClick = useCallback(
    (newValueOption: string) => {
      const newValueOptionNumber = Number(newValueOption)
      let newValue

      if (value) {
        if (value.some((v) => v === newValueOptionNumber)) {
          newValue = value.filter((v) => v !== newValueOptionNumber)
        } else {
          newValue = [...value, newValueOptionNumber].sort(
            (a: number, b: number) => a - b
          )
        }
      } else {
        newValue = [newValueOptionNumber]
      }

      setValue(newValue)
    },
    [setValue, value]
  )

  const doubleClick = useCallback(
    (newValueOption: string) => {
      const startValue = itemStartAt(type)
      let maxNumber = itemMaxNumber(type)

      // Internally "7" means nothing for "week-days" so itemMaxNumber should
      // be 7, not 8
      if (type === 'week-days') {
        maxNumber = 7
      }

      const limit = maxNumber + startValue
      const multiple = +newValueOption
      const newValue: number[] = []

      for (let i = startValue; i < limit; i++) {
        if (i % multiple === 0) {
          newValue.push(i)
        }
      }

      const oldValueEqualNewValue =
        value &&
        newValue &&
        value.length === newValue.length &&
        value.every((v: number, i: number) => v === newValue[i])

      const allValuesSelected = newValue.length === options.length

      if (allValuesSelected) {
        setValue([])
      } else if (oldValueEqualNewValue) {
        setValue([])
      } else {
        setValue(newValue)
      }
    },
    [type, value, options, setValue]
  )

  const clicksRef = useRef<number[]>([])
  const onOptionClick = useCallback(
    (newValueOption: string) => {
      if (!readOnly) {
        const doubleClickTimeout = 300
        const clicks = clicksRef.current
        clicks.push(new Date().getTime())

        const id = window.setTimeout(() => {
          if (
            clicks.length > 1 &&
            clicks[clicks.length - 1] - clicks[clicks.length - 2] <
              doubleClickTimeout
          ) {
            doubleClick(newValueOption)
          } else {
            simpleClick(newValueOption)
          }

          clicksRef.current = []
        }, doubleClickTimeout)

        return () => {
          window.clearTimeout(id)
        }
      }
    },
    [clicksRef, simpleClick, doubleClick, readOnly]
  )

  // Used by the select clear icon
  const onChange = useCallback(
    (newValue: any) => {
      if (!readOnly) {
        if (newValue && newValue.length === 0) {
          setValue([])
        }
      }
    },
    [setValue, readOnly]
  )

  const internalClassName = useMemo(
    () =>
      classNames({
        'react-js-cron-select': true,
        'react-js-cron-custom-select': true,
        [`${className}-select`]: !!className,
      }),
    [className]
  )

  const dropdownClassNames = useMemo(
    () =>
      classNames({
        'react-js-cron-select-dropdown': true,
        [`react-js-cron-select-dropdown-${type}`]: true,
        'react-js-cron-custom-select-dropdown': true,
        [`react-js-cron-custom-select-dropdown-${type}`]: true,
        [`react-js-cron-custom-select-dropdown-minutes-large`]:
          type === 'minutes' && period !== 'hour' && period !== 'day',
        [`react-js-cron-custom-select-dropdown-minutes-medium`]:
          type === 'minutes' && (period === 'day' || period === 'hour'),
        'react-js-cron-custom-select-dropdown-hours-twelve-hour-clock':
          type === 'hours' && clockFormat === '12-hour-clock',
        'react-js-cron-custom-select-dropdown-grid': !!grid,
        [`${className}-select-dropdown`]: !!className,
        [`${className}-select-dropdown-${type}`]: !!className,
      }),
    [className, type, grid, clockFormat, period]
  )

  return (
    <Select
      mode='tags'
      allowClear={!readOnly}
      virtual={false}
      open={readOnly ? false : open}
      value={stringValue}
      onChange={onChange}
      onClick={onClick}
      onBlur={onBlur}
      tagRender={renderTag}
      className={internalClassName}
      dropdownClassName={dropdownClassNames}
      options={options}
      showSearch={false}
      showArrow={!readOnly}
      menuItemSelectedIcon={null}
      dropdownMatchSelectWidth={false}
      onSelect={onOptionClick}
      onDeselect={onOptionClick}
      disabled={disabled}
      dropdownAlign={
        (type === 'minutes' || type === 'hours') &&
        period !== 'day' &&
        period !== 'hour'
          ? {
              // Usage: https://github.com/yiminghe/dom-align
              // Set direction to left to prevent dropdown to overlap window
              points: ['tr', 'br'],
            }
          : undefined
      }
      {...otherProps}
    />
  )
}
