import { storiesOf } from "@storybook/react";
import React from "react";
import StoryRouter from "storybook-react-router";

import { ObjectTypes } from "../../src/Components/ObjectTypes/ObjectTypes";
import { SchemaDescription } from "../../src/Domain/Api/DataTypes/SchemaDescription";

import objects from "./Responses/objects.json";

const schema: SchemaDescription = {
    allowReadAll: true,
    allowDelete: true,
    allowEdit: true,
    allowSort: true,
    schemaName: "ab",
    downloadLimit: 100,
    countLimit: 10,
    countLimitForSuperUser: 1000,
    downloadLimitForSuperUser: 10000,
};

storiesOf("ObjectTypes", module)
    .addDecorator(StoryRouter() as any)
    .add("Default", () => (
        <ObjectTypes
            filter=""
            identifierKeywords={[]}
            objects={[
                {
                    identifier: "table 1",
                    schemaDescription: schema,
                },
                {
                    identifier: "Table 3",
                    schemaDescription: schema,
                },
                {
                    identifier: "table 2",
                    schemaDescription: schema,
                },
            ]}
        />
    ))
    .add("EDI Objects", () => <ObjectTypes identifierKeywords={[]} filter="" objects={objects} />);
