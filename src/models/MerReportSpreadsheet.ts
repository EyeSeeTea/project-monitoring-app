import ExcelJS, { CellValue, Font, Alignment, Worksheet, Workbook, Column } from "exceljs";
import _ from "lodash";
import moment from "moment";
import MerReport, { staffKeys, getStaffTranslations } from "./MerReport";
import i18n from "../locales";
import { cell } from "../utils/spreadsheets";

type Value = TextValue | NumberValue | FormulaValue;

type Row = Value[];

type GetFormulaValue = (relativeColumn: number, relativeRow: number) => string;

interface ValueBase {
    font?: Partial<Font>;
    alignment?: Partial<Alignment>;
    height?: number;
    colspan?: number;
}

interface NumberValue extends ValueBase {
    type: "number";
    value: number | "";
}

interface TextValue extends ValueBase {
    type: "text";
    value: string;
}

interface FormulaValue extends ValueBase {
    type: "formula";
    value: GetFormulaValue;
}

class MerReportSpreadsheet {
    constructor(public merReport: MerReport) {}

    async generate(): Promise<{ buffer: ExcelJS.Buffer; filename: string }> {
        const { merReport } = this;
        const { date, organisationUnit } = merReport.data;
        const { config } = this.merReport;
        if (!date || !organisationUnit) throw new Error("No data");

        const now = moment();
        const workbook = new ExcelJS.Workbook();

        workbook.creator = config.currentUser.displayName;
        workbook.lastModifiedBy = config.currentUser.displayName;
        workbook.created = now.toDate();
        workbook.modified = now.toDate();

        this.addNarrativeSheet(workbook);
        this.addActivitesSheet(workbook);

        const buffer = await workbook.xlsx.writeBuffer();
        const orgUnitName = organisationUnit.displayName;
        const filename = ["MER", orgUnitName, date.format("YYYY_MM")].join("-") + ".xlsx";
        return { filename, buffer };
    }

    addNarrativeSheet(workbook: Workbook) {
        const { merReport } = this;
        const { config } = this.merReport;
        const title = i18n.t("Monthly Executive Report");
        const now = moment();
        const { date, countryDirector, projectedActivitiesNextMonth } = merReport.data;

        const rows = [
            [
                text(title, {
                    colspan: 6,
                    font: { bold: true, size: 12 },
                    alignment: { horizontal: "center" },
                }),
            ],
            [text(date.format("MMMM YYYY"), { colspan: 6 })],
            [text(i18n.t("Country Director") + ": " + countryDirector, { colspan: 6 })],
            [text(i18n.t("Prepared by") + ": " + config.currentUser.displayName, { colspan: 6 })],
            [text(now.format("LL"), { colspan: 6 })],
            [],
            [bold(i18n.t("Executive Summary"), { colspan: 6 })],
            [text(i18n.t("SECTOR")), text(i18n.t("Bullet-Point Info"), { colspan: 5 })],
            ...merReport
                .getExecutiveSummaries()
                .map(({ sector, value }) => [
                    text(sector.displayName),
                    text(value, { colspan: 5 }),
                ]),
            [],
            [bold(i18n.t("Ministry Summary"), { colspan: 6 })],
            [text(merReport.data.ministrySummary, { colspan: 6 })],
            [],
            [bold(i18n.t("Staff Summary"), { colspan: 6 })],
            [],
            ...insertColumns(getStaffSummary(merReport), 1),
            [],
            [bold(i18n.t("Projected Activities for the Next Month"), { colspan: 6 })],
            [text(projectedActivitiesNextMonth, { colspan: 6 })],
            [],
            [bold(i18n.t("Additional comments"), { colspan: 6 })],
            [text(merReport.data.additionalComments, { colspan: 6 })],
            [],
        ];

        const sheet = addWorkSheet(workbook, i18n.t("Narrative"), rows);

        _.range(1, sheet.columnCount + 1).forEach(
            columnIndex => (sheet.getColumn(columnIndex).width = 15)
        );
    }

    addActivitesSheet(workbook: Workbook) {
        const { merReport } = this;

        const dataRows: Row[] = _.flatMap(merReport.data.projectsData, project => {
            return project.dataElements.map(de => {
                return [
                    text(`${project.name} (${project.dateInfo})`),
                    text(de.name),
                    float(de.target),
                    float(de.actual),
                    float(de.achieved),
                    text(de.comment),
                ];
            });
        });
        const columns = [
            header(i18n.t("Project"), { width: 40 }),
            header(i18n.t("Indicators"), { width: 60 }),
            header(i18n.t("Target"), { width: 10, isNumber: true }),
            header(i18n.t("Actual"), { width: 10, isNumber: true }),
            header(i18n.t("Achieved to date (%)"), { width: 10, isNumber: true }),
            header(i18n.t("Comment"), { width: 50 }),
        ];

        const sheet = addWorkSheet(workbook, i18n.t("Activities"), dataRows, { columns });
        sheet.getRow(1).font = { bold: true };
        return sheet;
    }
}

type HeaderOptions = { width: number; isNumber?: boolean; center?: boolean };

function header(name: string | string[], headerOptions: HeaderOptions): Partial<Column> {
    const { width, isNumber = false, center = false } = headerOptions;

    return {
        header: name,
        width,
        style: {
            numFmt: isNumber ? "0.00" : undefined,
            ...(center ? { alignment: { horizontal: "center" } } : {}),
        },
    };
}

function addWorkSheet(
    workbook: Workbook,
    name: string,
    rows: Row[],
    options: { columns?: Partial<Column>[] } = {}
): Worksheet {
    const sheet = workbook.addWorksheet(name);
    if (options.columns) sheet.columns = options.columns;

    const sheetRows: CellValue[][] = rows.map((row, rowIdx) =>
        row.map((cell, colIdx) =>
            cell.type === "formula"
                ? { formula: cell.value(rowIdx, colIdx), date1904: false }
                : cell.value
        )
    );
    sheet.addRows(sheetRows);
    applyStyles(sheet, rows);
    return sheet;
}

function applyStyles(sheet: Worksheet, rows: Row[]): void {
    rows.forEach((row, rowIndex) => {
        row.forEach((cell, columnIndex) => {
            const sheetCell = sheet.getCell(rowIndex + 1, columnIndex + 1);

            if (cell.colspan) {
                const left = columnIndex + 1;
                sheet.mergeCells({
                    top: rowIndex + 1,
                    left,
                    bottom: rowIndex + 1,
                    right: left + cell.colspan - 1,
                });
            }

            if (cell.type === "text") {
                const nLines = cell.value.trim().split(/\n/).length;
                if (nLines > 1) {
                    cell.height = 12 * nLines;
                }
            }

            sheetCell.alignment = { ...sheetCell.alignment, vertical: "top", ...cell.alignment };

            if (cell.font) {
                sheetCell.font = cell.font;
            }
        });

        const maxHeight = _(row)
            .map(cell => cell.height)
            .compact()
            .max();
        if (maxHeight) sheet.getRow(rowIndex + 1).height = maxHeight;
    });
}

function getStaffSummary(report: MerReport): Row[] {
    const translations = getStaffTranslations();
    const valuesList = staffKeys.map(staffKey => {
        const staff = _(report.data.staffSummary).get(staffKey, null);
        return { key: staffKey, values: staff };
    });

    const sumOfPrevious2Rows = formula((row, col) =>
        ["SUM(", cell(col - 2, row), ":", cell(col - 1, row), ")"].join("")
    );

    const sumOfPreviousStaffColumns = formula((row, col) =>
        ["SUM(", cell(col, row - staffKeys.length), ":", cell(col, row - 1), ")"].join("")
    );

    return [
        [
            text(""),
            bold(i18n.t("Full-time"), { alignment: { horizontal: "center" } }),
            bold(i18n.t("Part-time"), { alignment: { horizontal: "center" } }),
            bold(i18n.t("Total"), { alignment: { horizontal: "center" } }),
        ],
        ...valuesList.map(({ key, values }) => {
            return [
                italic(translations[key]),
                float(values ? values.fullTime : null),
                float(values ? values.partTime : null),
                sumOfPrevious2Rows,
            ];
        }),
        [
            bold(i18n.t("Total")),
            sumOfPreviousStaffColumns,
            sumOfPreviousStaffColumns,
            sumOfPrevious2Rows,
        ],
    ];
}

function insertColumns(rows: Row[], count: number): Row[] {
    const newColumns = _.times(count).map(_i => text(""));
    return rows.map(row => [...newColumns, ...row]);
}

type Options = Omit<TextValue, "type" | "value">;

function formula(value: GetFormulaValue, options: Options = {}): FormulaValue {
    return { type: "formula", value, ...options };
}

function float(n: number | null | undefined, options: Options = {}): Value {
    return { type: "number", value: _.isNil(n) ? "" : n, ...options };
}

function text(s: string, options: Options = {}): Value {
    return { type: "text", value: s, ...options };
}

function bold(s: string, options: Options = {}): Value {
    return text(s, { font: { bold: true, size: 10 }, ...options });
}

function italic(s: string, options: Options = {}): Value {
    return text(s, { font: { italic: true, size: 10 }, ...options });
}

export default MerReportSpreadsheet;
