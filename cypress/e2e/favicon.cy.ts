describe("Favicon", () => {
  it("links a favicon, an SVG icon and an Apple touch icon, and serves them", () => {
    cy.visit("/");
    cy.get('head link[rel~="icon"], head link[rel="apple-touch-icon"]').then(($links) => {
      const links = [...$links].map((l) => ({ rel: l.getAttribute("rel"), href: (l as HTMLLinkElement).href }));
      const paths = links.map((l) => new URL(l.href).pathname);
      expect(paths).to.include.members(["/favicon.ico", "/icon.svg", "/apple-icon.png"]);
      expect(links.find((l) => new URL(l.href).pathname === "/apple-icon.png")?.rel).to.equal("apple-touch-icon");
      links.forEach(({ href }) =>
        cy.request(href).then((res) => {
          expect(res.status).to.equal(200);
          expect(res.headers["content-type"]).to.match(/^image\//);
        }),
      );
    });
  });

  it("shows the same mark in the navbar logo", () => {
    cy.visit("/courses");
    cy.contains('nav[aria-label="Main"] a', "NowLMS").find('svg[aria-hidden="true"]').should("be.visible");
  });
});
