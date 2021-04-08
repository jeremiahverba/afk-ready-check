export const preloadTemplates = async function () {
  const templatePaths = ['./../templates/ready-check.hbs'];
  Handlebars.registerHelper('json', function (context) {
    return JSON.stringify(context);
  });

  return loadTemplates(templatePaths);
};
