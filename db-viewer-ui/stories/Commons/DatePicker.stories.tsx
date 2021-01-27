import { action } from "@storybook/addon-actions";
import { storiesOf } from "@storybook/react";
import React from "react";

import { DatePicker } from "../../src/Components/DateTimeRangePicker/DatePicker";
import { TimeUtils } from "../../src/Domain/Utils/TimeUtils";
import { WithState } from "../WithState";

function getInitialValue(value: Date): { value: Date } {
    return {
        value: value,
    };
}

storiesOf("DatePicker", module)
    .add("Default", () => (
        <WithState initial={getInitialValue(new Date())}>
            {(state, onChange) => (
                <DatePicker
                    value={state.value}
                    onChange={x => {
                        action("onChange")(x);
                        onChange({ value: x || undefined });
                    }}
                />
            )}
        </WithState>
    ))
    .add("Default [timezone=Moscow]", () => (
        <WithState initial={getInitialValue(new Date())}>
            {(state, onChange) => (
                <DatePicker
                    value={state.value}
                    timeZone={TimeUtils.TimeZones.Moscow}
                    onChange={x => {
                        action("onChange")(x);
                        onChange({ value: x || undefined });
                    }}
                />
            )}
        </WithState>
    ))
    .add("Disabled", () => (
        <WithState initial={getInitialValue(new Date())}>
            {(state, onChange) => (
                <DatePicker
                    value={state.value}
                    disabled
                    onChange={x => {
                        action("onChange")(x);
                        onChange({ value: x || undefined });
                    }}
                />
            )}
        </WithState>
    ))
    .add("With error", () => (
        <WithState initial={getInitialValue(new Date())}>
            {(state, onChange) => (
                <DatePicker
                    value={state.value}
                    error
                    onChange={x => {
                        action("onChange")(x);
                        onChange({ value: x || undefined });
                    }}
                />
            )}
        </WithState>
    ));
