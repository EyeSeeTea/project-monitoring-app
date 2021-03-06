import React from "react";
import { Checkbox, FormControlLabel } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import MultipleDropdown from "../../components/dropdown/MultipleDropdown";
import i18n from "../../locales";

interface ProjectsListFiltersProps {
    filter: Filter;
    filterOptions: FilterOptions;
    onChange(newFilters: Filter): void;
}

export interface Filter {
    countries?: string[];
    sectors?: string[];
    onlyActive?: boolean;
}

type Option = { id: string; displayName: string };

export interface FilterOptions {
    countries: Option[];
    sectors: Option[];
}

const emptyValues: string[] = [];

const ProjectsListFilters: React.FC<ProjectsListFiltersProps> = props => {
    const { filter, filterOptions, onChange } = props;
    const classes = useStyles();
    const countryItems = useMemoOptions(filterOptions.countries);
    const sectorItems = useMemoOptions(filterOptions.sectors);
    const notifyCountriesChange = React.useCallback(
        countries => onChange({ ...filter, countries }),
        [onChange, filter]
    );

    const notifySectorsChange = React.useCallback(sectors => onChange({ ...filter, sectors }), [
        onChange,
        filter,
    ]);

    return (
        <div>
            <MultipleDropdown
                items={countryItems}
                values={filter.countries || emptyValues}
                onChange={notifyCountriesChange}
                label={i18n.t("Countries")}
            />

            <MultipleDropdown
                items={sectorItems}
                values={filter.sectors || emptyValues}
                onChange={notifySectorsChange}
                label={i18n.t("Sectors")}
            />

            <FormControlLabel
                label={i18n.t("Active")}
                className={classes.checkbox}
                control={
                    <Checkbox
                        checked={!!filter.onlyActive}
                        onChange={ev => onChange({ ...filter, onlyActive: ev.target.checked })}
                    />
                }
            />
        </div>
    );
};

const useStyles = makeStyles({
    checkbox: { marginLeft: 5 },
});

function useMemoOptions(options: Option[]) {
    return React.useMemo(() => {
        return options.map(option => ({
            value: option.id,
            text: option.displayName,
        }));
    }, [options]);
}

export default React.memo(ProjectsListFilters);
