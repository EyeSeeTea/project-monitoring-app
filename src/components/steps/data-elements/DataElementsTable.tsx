import React, { useState, useEffect, useMemo } from "react";
import {
    ObjectsTable,
    useSnackbar,
    RowConfig,
    TableAction,
    ObjectsTableProps,
} from "d2-ui-components";
import { TablePagination, TableColumn, TableSorting } from "d2-ui-components";
import _ from "lodash";

import DataElementsFilters, { Filter, FilterKey } from "./DataElementsFilters";
import i18n from "../../../locales";
import DataElementsSet, {
    SelectionInfo,
    DataElement as DataElement_,
} from "../../../models/dataElementsSet";
import { Id } from "../../../types/d2-api";
import { onTableChange, withPaired, getName } from "./table-utils";

// Column names must be known to the model interface, so we need to add keys used in custom columns
export type DataElement = DataElement_ & { isCovid19?: boolean };

export interface DataElementsTableProps {
    dataElementsSet: DataElementsSet;
    sectorId: Id;
    onlySelected?: boolean;
    onSelectionChange?: (dataElementIds: Id[]) => SelectionInfo;
    showGuidance?: boolean;
    columns: FieldName[];
    customColumns?: TableColumn<DataElement>[];
    actions?: TableAction<DataElement>[];
    visibleFilters?: FilterKey[];
}

const paginationOptions = {
    pageSizeOptions: [10, 20, 50],
};

const initialPagination: Partial<TablePagination> = {
    pageSize: 20,
    page: 1,
};

const initialSorting: TableSorting<DataElement> = {
    field: "series",
    order: "asc" as const,
};

export type FieldName =
    | "name"
    | "code"
    | "peopleOrBenefit"
    | "series"
    | "countingMethod"
    | "externals"
    | "indicatorType";

export const sortableFields = [
    "name",
    "code",
    "peopleOrBenefit",
    "series",
    "countingMethod",
    "externals",
] as const;

export type SortableField = typeof sortableFields[number];

const searchBoxColumns = ["name" as const, "code" as const, "search" as const];

const DataElementsTable: React.FC<DataElementsTableProps> = props => {
    const {
        dataElementsSet,
        sectorId,
        onSelectionChange,
        columns: initialColumns,
        visibleFilters,
        onlySelected,
        showGuidance = true,
        customColumns,
        actions,
    } = props;
    const snackbar = useSnackbar();
    const [filter, setFilter] = useState<Filter>({});

    useEffect(() => setFilter({}), [sectorId]);

    const fullFilter = { onlySelected, ...filter, sectorId };

    const dataElements = useMemo(() => dataElementsSet.get(fullFilter), [
        dataElementsSet,
        fullFilter,
    ]);

    const filterOptions = useMemo(() => {
        const dataElements = dataElementsSet.get({ ...filter, sectorId });
        return {
            externals: _.sortBy(_.uniq(_.flatten(dataElements.map(de => de.externals)))),
        };
    }, [dataElementsSet, sectorId, filter]);

    const selection = useMemo(() => {
        return onSelectionChange
            ? dataElementsSet.get({ onlySelected: true, sectorId }).map(de => ({ id: de.id }))
            : undefined;
    }, [dataElementsSet, onSelectionChange, sectorId]);

    const initialState = useMemo(() => {
        return { pagination: initialPagination, sorting: initialSorting };
    }, []);

    const onChange = React.useCallback<NonNullable<ObjectsTableProps<DataElement>["onChange"]>>(
        state => {
            if (onSelectionChange) return onTableChange(onSelectionChange, snackbar, state);
        },
        [onSelectionChange, snackbar]
    );

    const filterComponents = React.useMemo(
        () => (
            <DataElementsFilters
                key="filters"
                filter={filter}
                filterOptions={filterOptions}
                onChange={setFilter}
                visibleFilters={visibleFilters}
            />
        ),
        [filter, filterOptions, setFilter, visibleFilters]
    );

    const rowConfig = React.useCallback(
        (de: DataElement): RowConfig => ({
            selectable: de.selectable,
            style: de.selectable ? undefined : { backgroundColor: "#F5DFDF" },
        }),
        []
    );

    const allColumns = React.useMemo(() => {
        const paired = dataElementsSet.arePairedGrouped;
        const columns = [
            {
                name: "name" as const,
                text: i18n.t("Name"),
                sortable: true,
                getValue: (de: DataElement) => getName(de, paired, showGuidance),
            },
            {
                name: "code" as const,
                text: i18n.t("Code"),
                sortable: true,
                getValue: withPaired(paired, "code"),
            },
            { name: "indicatorType" as const, text: i18n.t("Indicator Type"), sortable: true },
            {
                name: "peopleOrBenefit" as const,
                text: i18n.t("People / Benefit"),
                sortable: true,
                getValue: withPaired(paired, "peopleOrBenefit"),
            },
            {
                name: "series" as const,
                text: i18n.t("Series"),
                sortable: true,
                getValue: withPaired(paired, "series"),
            },
            {
                name: "countingMethod" as const,
                text: i18n.t("Counting Method"),
                sortable: true,
                getValue: withPaired(paired, "countingMethod"),
            },
            {
                name: "externals" as const,
                text: i18n.t("Externals"),
                sortable: true,
                getValue: withPaired(paired, "externals", externals => externals.join(", ")),
            },
        ];
        const columnsToShow: TableColumn<DataElement>[] = _(columns)
            .keyBy(column => column.name)
            .at(initialColumns)
            .value();
        return _.concat(columnsToShow, customColumns || []);
    }, [initialColumns, customColumns, showGuidance, dataElementsSet.arePairedGrouped]);

    if (!sectorId) return null;

    return (
        <ObjectsTable<DataElement>
            selection={selection}
            rows={dataElements}
            rowConfig={rowConfig}
            forceSelectionColumn={true}
            initialState={initialState}
            columns={allColumns}
            searchBoxLabel={i18n.t("Search by name / code")}
            onChange={onChange}
            searchBoxColumns={searchBoxColumns}
            resetKey={JSON.stringify(fullFilter)}
            filterComponents={filterComponents}
            actions={actions}
            paginationOptions={paginationOptions}
        />
    );
};

export default React.memo(DataElementsTable);
