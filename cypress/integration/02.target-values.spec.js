import DataEntryPage from "../support/pages/data-entry-page";

describe("Target Values", () => {
    beforeEach(() => {
        cy.login("admin");
        cy.loadPage();
        cy.contains("00Cypress Project").trigger("contextmenu");
        cy.contains("Add Target Values").click();
    });

    it("can enter data values with new/returning validations", () => {
        const entryPage = new DataEntryPage("data-entry");
        entryPage.selectInput("WS8XV4WWPE7", "GI9GyGCQwTf", 10);

        const dataElementId = "e6wdrrz9ZS6";
        const cocIds = {
            newMal: "TpxiQHEumCA",
            returningMale: "SW9iYI4GmW2",
            newFemale: "Oq364hCb4KD",
            returningFemale: "ZbU1cop8Gzl",
        };

        entryPage.selectTab("Livelihood");
        entryPage.selectInput(dataElementId, cocIds.newMal, 1);
        entryPage.selectInput(dataElementId, cocIds.returningMale, 0);
        entryPage.selectInput(dataElementId, cocIds.newFemale, 2);
        entryPage.selectInput(dataElementId, cocIds.returningFemale, 0);

        entryPage.selectMonth(1);

        entryPage.selectTab("Livelihood");
        entryPage.selectInput(dataElementId, cocIds.newMal, 2);
        entryPage.selectInput(dataElementId, cocIds.returningMale, 1);
        entryPage.selectInput(dataElementId, cocIds.newFemale, 3);
        entryPage.selectInput(dataElementId, cocIds.returningFemale, 0);

        entryPage.selectMonth(2);

        entryPage.selectTab("Livelihood");
        entryPage.selectInput(dataElementId, cocIds.newMal, 3);
        entryPage.selectInput(dataElementId, cocIds.returningMale, 4);
        entryPage.hasValidationError("Returning value (4) cannot be greater");
    });
});
