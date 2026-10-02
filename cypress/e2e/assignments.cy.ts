const SQA = "/courses/software-quality-assurance";
const PDF = "tests/fixtures/sample.pdf";

function postAssignment(title: string) {
  cy.visit(`${SQA}/assignments`);
  cy.get("#assignment-title").type(title);
  cy.get("#assignment-instructions").type("Write 5 test cases for the login page.");
  cy.get("#assignment-due").type("2030-01-15T17:00");
  cy.get("#assignment-max").clear().type("100");
  cy.contains("button", "Post assignment").click();
  cy.contains(`"${title}" was posted.`);
}

describe("Assignments", () => {
  it("tutor posts, student submits, tutor grades, student sees the grade", () => {
    cy.login("tutor");
    postAssignment("Login test cases");

    cy.logoutAll();
    cy.login("student");
    cy.enrollInSqa();
    cy.visit("/student/assignments");
    cy.contains("tr", "Login test cases").should("contain", "To do");
    cy.contains("a", "Login test cases").click();
    cy.get("#submission-text").type("TC1: valid login…");
    cy.get("#submission-link").type("https://github.com/student/qa-homework");
    cy.get("#submission-file").selectFile(PDF);
    cy.contains("button", "Submit assignment").click();
    cy.contains("Submitted · awaiting grade");
    cy.contains("a", "sample.pdf");

    cy.logoutAll();
    cy.login("tutor");
    cy.visit(`${SQA}/assignments`);
    cy.contains("1 to grade");
    cy.contains("a", "Login test cases").click();
    cy.get('[data-student="student@nowlms.local"]').within(() => {
      cy.contains("TC1: valid login");
      cy.contains("a", "sample.pdf")
        .invoke("attr", "href")
        .then((href) => cy.request(String(href)).its("status").should("eq", 200));
      cy.get('input[name="score"]').type("150");
      cy.get('input[name="score"]').then(($i) => expect(($i[0] as HTMLInputElement).validity.rangeOverflow).to.eq(true));
      cy.get('input[name="score"]').clear().type("85");
      cy.get('textarea[name="feedback"]').type("Great coverage.");
      cy.contains("button", "Save grade").click();
      cy.contains("Grade saved.");
    });

    cy.logoutAll();
    cy.login("student");
    cy.visit("/student/assignments");
    cy.contains("tr", "Login test cases").should("contain", "Graded · 85/100");
    cy.get('[data-testid="overall-score"]').should("have.text", "85%");
    cy.contains("a", "Login test cases").click();
    cy.contains("Grade: 85/100");
    cy.contains("Great coverage.");
    cy.contains("button", /Submit assignment|Update submission/).should("not.exist");
  });

  it("lets students update a submission before it is graded", () => {
    cy.login("tutor");
    postAssignment("Bug report");

    cy.logoutAll();
    cy.login("student");
    cy.enrollInSqa();
    cy.visit(`${SQA}/assignments`);
    cy.contains("a", "Bug report").click();
    cy.get("#submission-text").type("First draft");
    cy.contains("button", "Submit assignment").click();
    cy.contains("Submitted · awaiting grade");
    cy.get("#submission-text").clear().type("Final version");
    cy.contains("button", "Update submission").click();
    cy.contains("p", "Final version");
  });

  it("keeps submission files private to the student and the course's teachers", () => {
    cy.login("tutor");
    postAssignment("Private work");

    cy.logoutAll();
    cy.login("student");
    cy.enrollInSqa();
    cy.visit(`${SQA}/assignments`);
    cy.contains("a", "Private work").click();
    cy.get("#submission-file").selectFile(PDF);
    cy.contains("button", "Submit assignment").click();
    cy.contains("a", "sample.pdf")
      .invoke("attr", "href")
      .then((href) => {
        cy.logoutAll();
        cy.registerStudent("Other Student", "other@example.com");
        cy.enrollInSqa();
        cy.request({ url: String(href), failOnStatusCode: false }).its("status").should("eq", 403);
      });
  });

  it("keeps students who are not enrolled away from a course's assignments", () => {
    cy.login("student");
    cy.visit(`${SQA}/assignments`);
    cy.location("pathname").should("eq", SQA);
  });

  it("keeps tutors away from assignments of courses they don't teach", () => {
    cy.login("tutor");
    cy.visit("/courses/data-analytics/assignments");
    cy.location("pathname").should("eq", "/courses/data-analytics");
  });
});

export {};
