import Helper from "./helper.js";
  
/** Set and remember the environment. */
class Env {

  constructor() {
    this.configUrlTemplate =
    "https://raw.githubusercontent.com/{%github}/trovu-data-user/master/config.yml";
    this.fetchUrlTemplateDefault =
    "https://raw.githubusercontent.com/trovu/trovu-data/master/shortcuts/{%namespace}/{%keyword}/{%argumentCount}.yml";
  }

  jqueryParam(a) {
    var s = [];
    var add = function(k, v) {
      v = typeof v === "function" ? v() : v;
      v = v === null ? "" : v === undefined ? "" : v;
      s[s.length] = encodeURIComponent(k) + "=" + encodeURIComponent(v);
    };
    var buildParams = function(prefix, obj) {
      var i, len, key;

      if (prefix) {
        if (Array.isArray(obj)) {
          for (i = 0, len = obj.length; i < len; i++) {
            buildParams(
              prefix +
                "[" +
                (typeof obj[i] === "object" && obj[i] ? i : "") +
                "]",
              obj[i]
            );
          }
        } else if (String(obj) === "[object Object]") {
          for (key in obj) {
            buildParams(prefix + "[" + key + "]", obj[key]);
          }
        } else {
          add(prefix, obj);
        }
      } else if (Array.isArray(obj)) {
        for (i = 0, len = obj.length; i < len; i++) {
          add(obj[i].name, obj[i].value);
        }
      } else {
        for (key in obj) {
          buildParams(key, obj[key]);
        }
      }
      return s;
    };

    return buildParams("", a).join("&");
  }

  // Based on:
  // https://stackoverflow.com/a/3355892/52023
  jqueryDeparam(paramStr) {
    // Prepare params.
    var params = {};

    // Get pairs.
    var keyValueStrings = paramStr.split("&");

    // Iterate over all pairs.
    for (let keyValueString of keyValueStrings) {
      let [name, value] = keyValueString.split("=");

      if (typeof value == "undefined") {
        value = "";
      }

      // Decode.
      name = decodeURIComponent(name);
      value = value.replace(/\+/g, "%20");
      value = decodeURIComponent(value);

      name = name.trim();

      // Skip empty.
      if ("" == name) {
        continue;
      }

      // Prepare indices.
      let indices = [];

      // Move indices from string into array.
      name = name.replace(/\[([^\]]*)\]/g, function(k, idx) {
        indices.push(idx);
        return "";
      });

      indices.unshift(name);
      var o = params;

      for (var j = 0; j < indices.length - 1; j++) {
        var idx = indices[j];
        if (!o[idx]) {
          o[idx] = {};
        }
        o = o[idx];
      }

      idx = indices[indices.length - 1];
      if (idx == "") {
        o.push(value);
      } else {
        o[idx] = value;
      }
    }
    return params;
  }

  // Param getters ====================================================

  /**
   * Get parameters from the URL query string.
   *
   * @return {array} params - List of found parameters.
   */
  getParams() {
    var paramStr = window.location.hash.substr(1);
    let params = this.jqueryDeparam(paramStr);
    return params;
  }

  getDefaultLanguageAndCountry() {
    // Get from browser.
    let languageStr = navigator.language;
    let language, country;
    if (languageStr) {
      [language, country] = languageStr.split("-");
    }

    // Set defaults.
    language = language || "en";
    country = country || "us";

    // Ensure lowercase.
    language = language.toLowerCase();
    country = country.toLowerCase();
    return {
      language: language,
      country: country
    };
  }

  getDefaultLanguage() {
    let languageCountry = this.getDefaultLanguageAndCountry();
    return languageCountry.language;
  }

  getDefaultCountry() {
    let languageCountry = this.getDefaultLanguageAndCountry();
    return languageCountry.country;
  }

  addFetchUrlTemplates(params) {
    for (let i in this.namespaces) {
      // Site namespaces, from trovu-data.
      if (typeof this.namespaces[i] == "string") {
        if (this.namespaces[i].length < 4) {
          let name = this.namespaces[i];
          this.namespaces[i] = {
            name: name,
            url:
              "https://raw.githubusercontent.com/trovu/trovu-data/master/shortcuts/" +
              name +
              "/{%keyword}/{%argumentCount}.yml"
          };
          this.namespaces[i].type = "site";
        }
        // User namespaces may also have completely custom URL (template).
        // Must contain {%keyword} and {%argumentCount}.
      } else if (this.namespaces[i].url && this.namespaces[i].name) {
        this.namespaces[i].type = "user";
        // User namespaces, from custom trovu-data-user.
      } else if (this.namespaces[i].github) {
        if (this.namespaces[i].github == ".") {
          // Set to current user.
          this.namespaces[i].github = params.github;
        }
        // Default to Github name.
        if (!this.namespaces[i].name) {
          this.namespaces[i].name = this.namespaces[i].github;
        }
        this.namespaces[i].url =
          "https://raw.githubusercontent.com/" +
          this.namespaces[i].github +
          "/trovu-data-user/master/shortcuts/{%keyword}.{%argumentCount}.yml";
        this.namespaces[i].type = "user";
      }
    }
  }

  withoutFunctions() {
    let envWithoutFunctions = {};
    for (let key of Object.keys(this)) {
      if (typeof this[key] != "function") {
        envWithoutFunctions[key] = this[key];
      }
    }
    return envWithoutFunctions;
  }

  async populate(params) {
    if (!params) {
      params = this.getParams();
    }
    let githubFailed;

    // Try Github config.
    if (params.github) {
      let configUrl = this.configUrlTemplate.replace(
        "{%github}",
        params.github
      );
      let configYml = await Helper.fetchAsync(configUrl, false, params.debug);
      if (configYml) {
        Object.assign(this, jsyaml.load(configYml));
      } else {
        githubFailed = true;
        alert("Failed to read Github config from " + configUrl);
      }
    }

    // Override all with params.
    Object.assign(this, params);

    if (githubFailed) {
      delete this.github;
    }

    // Default language.
    if (typeof this.language != "string") {
      this.language = this.getDefaultLanguage();
    }
    // Default country.
    if (typeof this.country != "string") {
      this.country = this.getDefaultCountry();
    }
    // Default namespaces.
    if (typeof this.namespaces != "object") {
      this.namespaces = ["o", this.language, "." + this.country];
    }

    this.addFetchUrlTemplates(params);
  }
};

export default Env;
