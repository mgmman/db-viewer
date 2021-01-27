import { Fit, RowStack } from "@skbkontur/react-stack-layout";
import { Button, Link, Modal } from "@skbkontur/react-ui";
import { ValidationContainer } from "@skbkontur/react-ui-validations";
import React from "react";
import { RouteComponentProps, withRouter } from "react-router";
import { Link as RouterLink } from "react-router-dom";

import { Condition } from "../../Domain/Api/DataTypes/Condition";
import { PropertyMetaInformation } from "../../Domain/Api/DataTypes/PropertyMetaInformation";
import { RouteUtils } from "../../Domain/Utils/RouteUtils";
import { ObjectFilter } from "../ObjectFilter/ObjectFilter";

import styles from "./ObjectTableLayoutHeader.less";

interface FilterModalProps extends RouteComponentProps {
    onClose: () => void;
    allowClose: boolean;
    modalEditingConditions: Condition[];
    tableColumns: PropertyMetaInformation[];
    onApplyFilter: () => void;
    onChangeFilter: (x0: Condition[]) => void;
}

class FilterModalInternal extends React.Component<FilterModalProps> {
    public container: ValidationContainer | null = null;

    public handleApplyFilter = async () => {
        const isValid = this.container != null ? await this.container.validate() : true;
        if (isValid) {
            this.props.onApplyFilter();
        }
    };
    public render(): JSX.Element {
        const { tableColumns, onClose, modalEditingConditions, onChangeFilter, allowClose } = this.props;
        return (
            <Modal
                onClose={onClose}
                data-tid="FilterModal"
                ignoreBackgroundClick
                disableClose={!allowClose}
                noClose={!allowClose}>
                <Modal.Header>Фильтр</Modal.Header>
                <Modal.Body>
                    <ValidationContainer ref={el => (this.container = el)} scrollOffset={{ top: 100 }}>
                        <ObjectFilter
                            conditions={modalEditingConditions}
                            onChange={onChangeFilter}
                            tableColumns={tableColumns}
                        />
                    </ValidationContainer>
                </Modal.Body>
                <Modal.Footer panel>
                    <RowStack baseline block gap={2}>
                        <Fit>
                            <Button onClick={this.handleApplyFilter} use="primary" data-tid="Apply">
                                Применить
                            </Button>
                        </Fit>
                        <Fit>
                            {allowClose && (
                                <Button onClick={onClose} data-tid="Close">
                                    Закрыть
                                </Button>
                            )}
                        </Fit>
                        <Fit>
                            {allowClose ? (
                                <Link onClick={() => onChangeFilter([])} data-tid="Clear">
                                    Очистить фильтр
                                </Link>
                            ) : (
                                <RouterLink
                                    className={styles.routerLink}
                                    to={RouteUtils.backUrl(this.props)}
                                    data-tid="GoBackToList">
                                    Вернуться к списку видов объектов
                                </RouterLink>
                            )}
                        </Fit>
                    </RowStack>
                </Modal.Footer>
            </Modal>
        );
    }
}

export const FilterModal = withRouter(FilterModalInternal);
