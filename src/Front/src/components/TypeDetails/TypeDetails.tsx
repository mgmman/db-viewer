import Button from "@skbkontur/react-ui/Button";
import Toast from "@skbkontur/react-ui/components/Toast/Toast";
import Gapped from "@skbkontur/react-ui/Gapped";
import { IconName } from "@skbkontur/react-ui/Icon";
import Link from "@skbkontur/react-ui/Link";
import Loader from "@skbkontur/react-ui/Loader";
import Paging from "@skbkontur/react-ui/Paging";
import Spinner from "@skbkontur/react-ui/Spinner";
import { flatten } from "lodash";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps } from "react-router";
import { NavLink } from "react-router-dom";
import { FieldInfo } from "../../api/impl/FieldInfo";
import { FieldType } from "../../api/impl/FieldType";
import { Sort } from "../../api/impl/Sort";
import { SortDirection } from "../../api/impl/SortDirection";
import { TypeModel } from "../../api/impl/TypeModel";
import AdminToolsHeader from "../Common/AdminToolsHeader";
import { ColumnConfiguration } from "../Common/ColumnConfiguration";
import FullPageLoader, { LoaderState } from "../Common/FullPageLoader";
import ResultsTable from "../Common/ResultsTable";
import {
  IObjectsViewerStore,
  TypeOfConnect,
  unboxThunk,
} from "../IObjectsViewerStore";
import ObjectDetailsActions from "../ObjectDetails/ObjectDetailsView.actions";
import { IDictionary } from "../TypesList/IDictionary";
import { StringUtils } from "../utils/StringUtils";
import { IFilter } from "./IFilter";
import ObjectsListActions from "./ObjectsList.actions";
import { ILoadable } from "./ObjectsListReducers";
import SearchPanel from "./SearchPanel/SearchPanel";
import * as styles from "./TypeDetails.less";

const tableConfigsCache: IDictionary<ColumnConfiguration[]> = {};

interface IProps extends RouteComponentProps<IMatchParams> {
  type: string;
  onSearch: (
    filters: IDictionary<IFilter>,
    sorts: Sort[],
    skip: number,
    take: number
  ) => void;
  onCount: (filters: IDictionary<IFilter>, countLimit: number) => void;
  onDelete: (object: any) => void;
  typeDescription: TypeModel;
  list: ILoadable<Nullable<any>>;
  count: ILoadable<Nullable<number>>;
}

interface IState {
  showFilters: boolean;
  validations: IDictionary<boolean>;
  filters: IDictionary<IFilter>;
  sorts: Nullable<Sort>;
  searchableFields: FieldInfo[];
  loaderState: LoaderState;
  paging: Nullable<IPagingState>;
}

interface IPagingState {
  skip: number;
  take: number;
  countLimit: number;
}

class TypeDetails extends React.Component<IProps, IState> {
  constructor(props) {
    super(props);
    this.state = {
      showFilters: true,
      validations: {},
      filters: {},
      searchableFields: [],
      sorts: null,
      loaderState: LoaderState.Loading,
      paging: null,
    };
  }

  public componentDidMount() {
    const searchableFields = this.getSearchableFields(
      this.props.typeDescription.shape
    );
    this.setState(
      {
        loaderState: LoaderState.Success,
        filters: this.getDefaultFiltersState(searchableFields),
        searchableFields,
        paging: {
          skip: 0,
          take: 20,
          countLimit: this.props.typeDescription.schemaDescription
            .defaultCountLimit,
        },
      },
      () => {
        if (this.props.typeDescription.schemaDescription.enableDefaultSearch) {
          this.handleSearch();
        }
      }
    );
  }

  public render() {
    return (
      <div>
        <AdminToolsHeader
          routerLink
          title={this.props.type}
          backTo={this.props.match.url.endsWith("/") ? ".." : "."}
          backText={"Вернуться к списку типов"}
        />
        {this.renderContent()}
      </div>
    );
  }

  public componentWillUnmount() {
    tableConfigsCache[this.props.type] = null;
  }

  private getDefaultFiltersState = (
    searchableFields: FieldInfo[]
  ): IDictionary<IFilter> => {
    const result: IDictionary<IFilter> = {};
    for (const fieldInfo of searchableFields) {
      result[fieldInfo.meta.name] = {
        value: "",
        type: fieldInfo.meta.availableFilters[0],
      };
    }
    return result;
  };

  private renderContent() {
    const loadingStatus = this.state.loaderState;
    if (loadingStatus !== LoaderState.Success) {
      return <FullPageLoader state={loadingStatus} />;
    }
    return (
      <Gapped vertical>
        {this.renderSearchForm()}
        {this.renderCounts()}
        {this.renderTable()}
      </Gapped>
    );
  }

  private renderTable() {
    if (!this.props.list) {
      return null;
    }
    if (!this.props.list.data || this.props.list.data.length === 0) {
      return (
        <div className={styles.noData}>
          {this.props.list.loadingStatus === LoaderState.Loading ? (
            <Spinner type="big" caption="Загружаем..." />
          ) : (
            <div>Ничего не найдено</div>
          )}
        </div>
      );
    }
    return (
      <Loader active={this.props.list.loadingStatus === LoaderState.Loading}>
        <Gapped vertical>
          <Gapped verticalAlign={"baseline"} gap={50}>
            {this.renderBounds()}
            {this.renderPaging()}
          </Gapped>
          <ResultsTable
            results={this.props.list.data}
            columnsConfiguration={this.getOrCreateTableConfiguration()}
          />
        </Gapped>
      </Loader>
    );
  }

  private renderPaging() {
    if (
      !this.props.typeDescription.schemaDescription.countable ||
      this.props.count == null ||
      this.props.count.loadingStatus !== LoaderState.Success
    ) {
      return null;
    }
    const { skip, take } = this.state.paging;
    const currentPage = Math.floor(skip / take) + 1;
    const pagesCount = Math.ceil(this.props.count.data / take);
    return (
      <Paging
        activePage={currentPage}
        onPageChange={this.handleChangePage}
        pagesCount={pagesCount}
      />
    );
  }

  private handleChangePage = pageNumber => {
    this.setState(
      {
        paging: {
          ...this.state.paging,
          skip: (pageNumber - 1) * this.state.paging.take,
        },
      },
      () => this.handleSearch(true)
    );
  };

  private getSearchableFields = (typeDetails: FieldInfo): FieldInfo[] => {
    if (typeDetails.type === FieldType.Class) {
      return flatten(
        Object.values(typeDetails.fields).map(this.getSearchableFields)
      ).filter(x => !!x);
    }
    if (typeDetails.meta !== null && typeDetails.meta.isSearchable) {
      return [typeDetails];
    }
    return null;
  };

  private handleSearch = (skipCount: boolean = false) => {
    const invalidFields = [];
    for (const fieldInfo of this.state.searchableFields.filter(
      x => x.meta.isRequired
    )) {
      if (
        !this.state.filters[fieldInfo.meta.name] ||
        !this.state.filters[fieldInfo.meta.name].value
      ) {
        invalidFields.push(fieldInfo.meta.name);
      }
    }
    if (invalidFields.some(_ => true)) {
      this.setState({
        validations: invalidFields.reduce(
          (res, x) => ({ ...res, [x]: true }),
          {}
        ),
      });
      Toast.push(`Поля ${invalidFields.join(", ")} обязательны для заполнения`);
      return;
    }
    this.props.onSearch(
      this.state.filters,
      this.state.sorts ? [this.state.sorts] : null,
      this.state.paging.skip,
      this.state.paging.take
    );
    if (this.props.typeDescription.schemaDescription.countable && !skipCount) {
      this.props.onCount(this.state.filters, this.state.paging.countLimit);
    }
  };

  private renderBounds() {
    if (this.props.list.loadingStatus === LoaderState.Loading) {
      return <Spinner type="mini" caption="Загружаем..." />;
    }
    const { skip } = this.state.paging;
    const from = skip + 1;
    const to = skip + this.props.list.data.length;
    return (
      <span>
        Объекты с {from} по {to}
      </span>
    );
  }

  private renderCounts() {
    if (this.props.count == null) {
      return null;
    }
    const count = this.props.count.data;
    const countLimit = this.state.paging.countLimit;
    const maxCountLimit = this.props.typeDescription.schemaDescription
      .maxCountLimit;
    if (this.props.count.loadingStatus === LoaderState.Loading) {
      return <Spinner type="mini" caption="Считаем..." />;
    }
    return (
      <Gapped>
        <span>Найдено {count === countLimit ? `больше ${count}` : count}</span>
        {count === countLimit && (
          <Link onClick={this.handleGetExactCount}>
            Узнать точное количество (не больше чем {maxCountLimit})
          </Link>
        )}
      </Gapped>
    );
  }

  private handleGetExactCount = () => {
    this.setState(
      {
        paging: {
          ...this.state.paging,
          countLimit: this.props.typeDescription.schemaDescription
            .maxCountLimit,
        },
      },
      () => this.props.onCount(this.state.filters, this.state.paging.countLimit)
    );
  };

  private renderSearchForm() {
    if (!this.state.showFilters) {
      return (
        <div className={styles.searchForm}>
          <Link icon={"ArrowTriangleRight"} onClick={this.handleShowFilters}>
            Показать фильтры
          </Link>
        </div>
      );
    }
    return (
      <div className={styles.searchForm}>
        <Gapped vertical>
          <Link icon={"ArrowTriangleDown"} onClick={this.handleHideFilters}>
            Скрыть фильтры
          </Link>
          <SearchPanel
            filters={this.state.filters}
            onChangeFilter={this.handleChangeFilter}
            fields={this.state.searchableFields}
            validations={this.state.validations}
          />
          <Gapped>
            <Button use={"primary"} onClick={() => this.handleSearch(false)}>
              Искать
            </Button>
            <Button onClick={this.handleResetFilters}>Сбросить</Button>
          </Gapped>
        </Gapped>
      </div>
    );
  }

  private handleResetFilters = () => {
    this.setState({
      filters: this.getDefaultFiltersState(this.state.searchableFields),
    });
  };

  private getOrCreateTableConfiguration(): ColumnConfiguration[] {
    if (!tableConfigsCache[this.props.type]) {
      tableConfigsCache[this.props.type] = [
        ColumnConfiguration.create().withCustomRender((_, item) => {
          const identityFields = this.getIdentityFields(
            this.props.typeDescription.shape
          );
          const query = identityFields
            .map(
              x =>
                `${x.meta.name}=${
                  item[StringUtils.lowerCaseFirstLetter(x.meta.name)]
                }`
            )
            .join("&");
          return (
            <NavLink to={`${this.props.match.url}/Details?${query}`}>
              Подробности
            </NavLink>
          );
        }),
        ...this.state.searchableFields.map(field =>
          ColumnConfiguration.createByPath(
            StringUtils.lowerCaseFirstLetter(field.meta.name)
          )
            .withCustomRender(
              field.type === "DateTime"
                ? x => this.handleNullValues(x && x.toString())
                : x => this.handleNullValues((x || "").toString())
            )
            .withHeader(() => this.renderTableHeader(field))
        ),
      ];
    }
    return tableConfigsCache[this.props.type];
  }

  private renderTableHeader = (field: FieldInfo): React.ReactNode => {
    const currentDirection =
      this.state.sorts && this.state.sorts.field === field.meta.name
        ? this.state.sorts.direction
        : null;
    return (
      <Link
        onClick={() =>
          this.handleSort(field, this.getNewSortDirection(currentDirection))
        }
        icon={this.getSortDirectionIcon(currentDirection)}
      >
        {field.meta.name}
      </Link>
    );
  };

  private getSortDirectionIcon = (
    currentSortDirection: Nullable<SortDirection>
  ): IconName => {
    switch (currentSortDirection) {
      case null:
      case undefined:
        return "ArrowTriangleUpDown";
      case SortDirection.Descending:
        return "ArrowTriangleDown";
      case SortDirection.Ascending:
        return "ArrowTriangleUp";
    }
  };

  private getNewSortDirection = (
    currentSortDirection: Nullable<SortDirection>
  ): SortDirection => {
    switch (currentSortDirection) {
      case SortDirection.Ascending:
        return SortDirection.Descending;
      case SortDirection.Descending:
      case null:
      case undefined:
        return SortDirection.Ascending;
    }
  };

  private handleSort = (field: FieldInfo, direction: SortDirection) => {
    this.setState(
      {
        sorts: { field: field.meta.name, direction },
      },
      () => this.handleSearch(true)
    );
  };

  private getIdentityFields = (typeDetails: FieldInfo): FieldInfo[] => {
    if (typeDetails.type === FieldType.Class) {
      return flatten(
        Object.values(typeDetails.fields).map(this.getIdentityFields)
      ).filter(x => !!x);
    }
    if (typeDetails.meta !== null && typeDetails.meta.isIdentity) {
      return [typeDetails];
    }
    return null;
  };

  private handleNullValues = value => {
    if (value == null) {
      return <span className={styles.nullValue}>(null)</span>;
    }
    return value;
  };

  private handleShowFilters = () => this.setState({ showFilters: true });
  private handleHideFilters = () => this.setState({ showFilters: false });
  private handleChangeFilter = (name: string, value: IFilter) => {
    this.setState({
      validations: {
        ...this.state.validations,
        [name]: false,
      },
      filters: {
        ...this.state.filters,
        [name]: value,
      },
    });
  };
}

interface IMatchParams {
  type: string;
}

type ScopeNarrowerProps = RouteComponentProps<IMatchParams> &
  TypeOfConnect<typeof reduxConnector>;

// tslint:disable-next-line:max-classes-per-file
class ScopeNarrower extends React.Component<ScopeNarrowerProps> {
  public render() {
    const { type } = this.props.match.params;
    const count = this.props.types[type] ? this.props.types[type].count : null;
    const list = this.props.types[type] ? this.props.types[type].list : null;
    return (
      <TypeDetails
        {...this.props}
        type={type}
        typeDescription={this.props.typesDescriptions[type]}
        count={count}
        list={list}
        onCount={this.handleCount}
        onSearch={this.handleSearch}
        onDelete={this.handleDelete}
      />
    );
  }

  private handleSearch = (
    filters: IDictionary<IFilter>,
    sorts: Sort[],
    skip: number,
    take: number
  ) =>
    this.props.onSearch(
      this.props.match.params.type,
      filters,
      sorts,
      skip,
      take
    );
  private handleCount = (filters: IDictionary<IFilter>, countLimit: number) =>
    this.props.onCount(this.props.match.params.type, filters, countLimit);
  private handleDelete = (object: any) =>
    this.props.onDelete(this.props.match.params.type, object);
}

const reduxConnector = connect(
  (state: IObjectsViewerStore) => ({
    ...state.typeDetailsStore,
    typesDescriptions: state.typesListStore.descriptions,
  }),
  {
    onSearch: unboxThunk(ObjectsListActions.search),
    onCount: unboxThunk(ObjectsListActions.count),
    onDelete: unboxThunk(ObjectDetailsActions.delete),
  }
);

export default reduxConnector(ScopeNarrower);
