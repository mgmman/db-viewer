import { ColumnStack, Fit, RowStack } from "@skbkontur/react-stack-layout";
import { tooltip, ValidationInfo, ValidationWrapperV1 } from "@skbkontur/react-ui-validations";
import Input from "@skbkontur/react-ui/Input";
import Select from "@skbkontur/react-ui/Select";
import React from "react";

import { Condition } from "../../Domain/Api/DataTypes/Condition";
import { ObjectFieldFilterOperator } from "../../Domain/Api/DataTypes/ObjectFieldFilterOperator";
import { PropertyMetaInformation } from "../../Domain/Api/DataTypes/PropertyMetaInformation";
import { ticksToTimestamp, timestampToTicks } from "../../Domain/Utils/ConvertTimeUtil";
import { StringUtils } from "../../Domain/Utils/StringUtils";
import { TimeUtils } from "../../Domain/Utils/TimeUtils";
import { validateObjectField } from "../../Domain/Utils/ValidationUtils";
import { DateTimePicker } from "../DateTimeRangePicker/DateTimePicker";
import { FormRow } from "../FormRow/FormRow";

import { OperatorSelect } from "./OperatorSelect";

interface ObjectFilterProps {
    conditions: Condition[];
    onChange: (conditions: Condition[]) => void;
    tableColumns: PropertyMetaInformation[];
}

export class ObjectFilter extends React.Component<ObjectFilterProps> {
    public getCondition(property: PropertyMetaInformation): Condition {
        const { conditions } = this.props;
        const result = conditions.find(x => x.path === property.name);
        if (result == null) {
            return {
                path: property.name,
                operator: ObjectFieldFilterOperator.Equals,
                value: null,
            };
        }
        return result;
    }

    public updateItem(property: PropertyMetaInformation, conditionUpdate: Partial<Condition>) {
        const { conditions, onChange } = this.props;
        const conditionIndex = conditions.findIndex(x => x.path === property.name);
        if (conditionIndex >= 0) {
            onChange([
                ...conditions.slice(0, conditionIndex),
                { ...conditions[conditionIndex], ...conditionUpdate },
                ...conditions.slice(conditionIndex + 1),
            ]);
        } else {
            onChange([...conditions, { ...this.getCondition(property), ...conditionUpdate }]);
        }
    }

    public renderProperty(property: PropertyMetaInformation, value: Nullable<string>): JSX.Element {
        const type = property.type.typeName;
        if (type === "DateTime" || type === "DateTimeOffset") {
            return (
                <ColumnStack gap={2}>
                    <Fit>
                        <DateTimePicker
                            data-tid={"DateTimePicker"}
                            defaultTime={""}
                            error={false}
                            timeZone={TimeUtils.TimeZones.UTC}
                            onChange={(e, date) => this.updateItem(property, { value: timestampToTicks(date) })}
                            value={value ? ticksToTimestamp(value) : null}
                        />
                    </Fit>
                    <Fit>
                        <ValidationWrapperV1
                            data-tid="DateTimeValidation"
                            renderMessage={tooltip("right middle")}
                            validationInfo={this.getValidation(property, value)}>
                            <Input
                                data-tid={"DateTimeInTicks"}
                                onChange={(e, nextValue) => this.updateItem(property, { value: nextValue })}
                                value={value ? value : ""}
                            />
                        </ValidationWrapperV1>
                    </Fit>
                </ColumnStack>
            );
        }
        if (type === "Boolean") {
            return (
                <ValidationWrapperV1
                    data-tid="BooleanValidation"
                    renderMessage={tooltip("right middle")}
                    validationInfo={this.getValidation(property, value)}>
                    <Select
                        data-tid="BooleanSelect"
                        items={[null, "true", "false"].map(x => [x, String(x)])}
                        onChange={(e: any, nextValue: any) => {
                            this.updateItem(property, { value: nextValue });
                        }}
                        value={value || undefined}
                    />
                </ValidationWrapperV1>
            );
        }
        if (property.availableValues.length !== 0) {
            return (
                <ValidationWrapperV1
                    data-tid="EnumValidation"
                    renderMessage={tooltip("right middle")}
                    validationInfo={this.getValidation(property, value)}>
                    <Select
                        data-tid="EnumSelect"
                        items={[null, ...property.availableValues].map(x => [x, String(x)])}
                        onChange={(e: any, nextValue: any) => {
                            this.updateItem(property, { value: nextValue });
                        }}
                        value={value || undefined}
                    />
                </ValidationWrapperV1>
            );
        }
        return (
            <ValidationWrapperV1
                data-tid="InputValidation"
                renderMessage={tooltip("right middle")}
                validationInfo={this.getValidation(property, value)}>
                <Input
                    data-tid="Input"
                    onChange={(e, nextValue) => this.updateItem(property, { value: nextValue })}
                    value={value || ""}
                />
            </ValidationWrapperV1>
        );
    }

    public getValidation(property: PropertyMetaInformation, value: string | null | undefined): ValidationInfo | null {
        if (property.isRequired && StringUtils.isNullOrWhitespace(value)) {
            return { message: "Поле должно быть заполнено", type: "submit" };
        }
        return validateObjectField(value);
    }

    public render(): JSX.Element {
        const { tableColumns } = this.props;

        return (
            <ColumnStack gap={2} data-tid="ObjectFilters">
                {tableColumns
                    .map(x => [x, this.getCondition(x)] as [PropertyMetaInformation, Condition])
                    .map(([property, condition]) => (
                        <FormRow key={property.name} captionWidth={200} caption={property.name} data-tid="Filter">
                            <RowStack baseline block gap={5} data-tid={property.name}>
                                <Fit>
                                    <OperatorSelect
                                        value={condition.operator}
                                        onChange={value => this.updateItem(property, { operator: value })}
                                        availableValues={
                                            property.availableFilters || [ObjectFieldFilterOperator.Equals]
                                        }
                                    />
                                </Fit>
                                <Fit>{this.renderProperty(property, condition.value)}</Fit>
                            </RowStack>
                        </FormRow>
                    ))}
            </ColumnStack>
        );
    }
}