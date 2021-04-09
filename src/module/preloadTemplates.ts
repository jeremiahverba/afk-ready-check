export const preloadTemplates = async function () {
  const templatePaths = ['./../templates/ready-check.hbs'];
  Handlebars.registerHelper('json', function (context) {
    return JSON.stringify(context);
  });
  Handlebars.registerHelper('switch', function (value, options) {
    this.switch_value = value;
    this.switch_break = false;
    return options.fn(this);
  });

  Handlebars.registerHelper('case', function (value, options) {
    if (value == this.switch_value) {
      this.switch_break = true;
      return options.fn(this);
    }
  });

  Handlebars.registerHelper('default', function (value, options) {
    if (this.switch_break == false) {
      return value;
    }
  });

  return loadTemplates(templatePaths);
};
