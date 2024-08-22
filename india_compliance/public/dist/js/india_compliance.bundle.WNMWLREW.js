(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

  // ../india_compliance/india_compliance/public/js/regex_constants.js
  var NORMAL = "^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z1-9ABD-J]{1}[0-9A-Z]{1}$";
  var GOVT_DEPTID = "^[0-9]{2}[A-Z]{4}[0-9]{5}[A-Z]{1}[0-9]{1}[Z]{1}[0-9]{1}$";
  var NRI_ID = "^[0-9]{4}[A-Z]{3}[0-9]{5}[N][R][0-9A-Z]{1}$";
  var OIDAR = "^[9][9][0-9]{2}[A-Z]{3}[0-9]{5}[O][S][0-9A-Z]{1}$";
  var UNBODY = "^[0-9]{4}[A-Z]{3}[0-9]{5}[UO]{1}[N][A-Z0-9]{1}$";
  var TDS = "^[0-9]{2}[A-Z]{4}[A-Z0-9]{1}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[D][0-9A-Z]$";
  var TCS = "^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[C]{1}[0-9A-Z]{1}$";
  var REGISTERED_REGEX = new RegExp([NORMAL, GOVT_DEPTID].join("|"));
  var OVERSEAS_REGEX = new RegExp([NRI_ID, OIDAR].join("|"));
  var UNBODY_REGEX = new RegExp(UNBODY);
  var TDS_REGEX = new RegExp(TDS);
  var TCS_REGEX = new RegExp(TCS);
  var GSTIN_REGEX = new RegExp(
    [NORMAL, GOVT_DEPTID, NRI_ID, OIDAR, UNBODY, TDS, TCS].join("|")
  );
  var GST_INVOICE_NUMBER_FORMAT = new RegExp("^[^\\W_][A-Za-z\\d\\-/]{0,15}$");

  // ../india_compliance/india_compliance/public/js/utils.js
  frappe.provide("india_compliance");
  window.gst_settings = frappe.boot.gst_settings;
  Object.assign(india_compliance, {
    MONTH: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ],
    QUARTER: ["Jan-Mar", "Apr-Jun", "Jul-Sep", "Oct-Dec"],
    get_month_year_from_period(period) {
      const { filing_frequency } = gst_settings;
      const month_number = period.slice(0, 2);
      const year = period.slice(2);
      if (filing_frequency === "Monthly")
        return [this.MONTH[month_number - 1], year];
      else
        return [this.QUARTER[Math.floor(month_number / 3)], year];
    },
    get_gstin_query(party, party_type = "Company") {
      if (!party) {
        frappe.show_alert({
          message: __("Please select {0} to get GSTIN options", [__(party_type)]),
          indicator: "yellow"
        });
        return;
      }
      return {
        query: "india_compliance.gst_india.utils.get_gstin_list",
        params: { party, party_type }
      };
    },
    async get_gstin_options(party, party_type = "Company") {
      const { query, params } = india_compliance.get_gstin_query(party, party_type);
      const { message } = await frappe.call({
        method: query,
        args: params
      });
      return message;
    },
    async get_account_options(company) {
      if (!company)
        return;
      const { message } = await frappe.call({
        method: "india_compliance.gst_india.utils.get_all_gst_accounts",
        args: {
          company
        }
      });
      return message || [];
    },
    get_party_type(doctype) {
      return in_list(frappe.boot.sales_doctypes, doctype) ? "Customer" : "Supplier";
    },
    async set_gstin_status(field, transaction_date, force_update) {
      const gstin = field.value;
      if (!gstin || gstin.length !== 15)
        return field.set_description("");
      const { message } = await frappe.call({
        method: "india_compliance.gst_india.doctype.gstin.gstin.get_gstin_status",
        args: { gstin, transaction_date, force_update }
      });
      if (!message)
        return field.set_description("");
      field.set_description(
        india_compliance.get_gstin_status_desc(
          message == null ? void 0 : message.status,
          message == null ? void 0 : message.last_updated_on
        )
      );
      this.set_gstin_refresh_btn(field, transaction_date);
      return message;
    },
    validate_gst_transporter_id(transporter_id) {
      if (!transporter_id || transporter_id.length !== 15)
        return;
      frappe.call({
        method: "india_compliance.gst_india.doctype.gstin.gstin.validate_gst_transporter_id",
        args: { transporter_id }
      });
    },
    get_gstin_status_desc(status, datetime) {
      if (!status)
        return;
      const user_date = frappe.datetime.str_to_user(datetime);
      const pretty_date = frappe.datetime.prettyDate(datetime);
      const STATUS_COLORS = { Active: "green", Cancelled: "red" };
      return `<div class="d-flex indicator ${STATUS_COLORS[status] || "orange"}">
                    Status:&nbsp;<strong>${status}</strong>
                    <span class="text-right ml-auto gstin-last-updated">
                        <span title="${user_date}">
                            ${datetime ? "updated " + pretty_date : ""}
                        </span>
                    </span>
                </div>`;
    },
    set_gstin_refresh_btn(field, transaction_date) {
      if (!this.is_api_enabled() || gst_settings.sandbox_mode || !gst_settings.validate_gstin_status || field.$wrapper.find(".refresh-gstin").length)
        return;
      const refresh_btn = $(`
            <svg class="icon icon-sm refresh-gstin" style="">
                <use class="" href="#icon-refresh" style="cursor: pointer"></use>
            </svg>
        `).appendTo(field.$wrapper.find(".gstin-last-updated"));
      refresh_btn.on("click", async function() {
        const force_update = true;
        await india_compliance.set_gstin_status(
          field,
          transaction_date,
          force_update
        );
      });
    },
    set_state_options(frm) {
      const state_field = frm.get_field("state");
      const country = frm.get_field("country").value;
      if (country !== "India") {
        state_field.set_data([]);
        return;
      }
      state_field.set_data(frappe.boot.india_state_options || []);
    },
    can_enable_api(settings) {
      return settings.api_secret || frappe.boot.ic_api_enabled_from_conf;
    },
    is_api_enabled(settings) {
      if (!settings)
        settings = gst_settings;
      return settings.enable_api && india_compliance.can_enable_api(settings);
    },
    is_e_invoice_enabled() {
      return india_compliance.is_api_enabled() && gst_settings.enable_e_invoice;
    },
    validate_gstin(gstin) {
      if (!gstin || gstin.length !== 15) {
        frappe.msgprint(__("GSTIN must be 15 characters long"));
        return;
      }
      gstin = gstin.trim().toUpperCase();
      if (GSTIN_REGEX.test(gstin) && is_gstin_check_digit_valid(gstin)) {
        return gstin;
      } else {
        frappe.msgprint(__("Invalid GSTIN"));
      }
    },
    get_gstin_otp(company_gstin, error_type) {
      let description = `An OTP has been sent to the registered mobile/email for GSTIN ${company_gstin} for further authentication. Please provide OTP.`;
      if (error_type === "invalid_otp")
        description = `Invalid OTP was provided for GSTIN ${company_gstin}. Please try again.`;
      return new Promise((resolve) => {
        const prompt = new frappe.ui.Dialog({
          title: __("Enter OTP"),
          fields: [
            {
              fieldtype: "Data",
              label: __("One Time Password"),
              fieldname: "otp",
              reqd: 1,
              description
            }
          ],
          primary_action_label: __("Submit"),
          primary_action(values) {
            resolve(values.otp);
            prompt.hide();
          },
          secondary_action_label: __("Resend OTP"),
          secondary_action() {
            frappe.call({
              method: "india_compliance.gst_india.utils.gstr_utils.request_otp",
              args: { company_gstin },
              callback: function() {
                frappe.show_alert({
                  message: __("OTP has been resent."),
                  indicator: "green"
                });
                prompt.get_secondary_btn().addClass("disabled");
              }
            });
          }
        });
        prompt.show();
      });
    },
    guess_gst_category(gstin, country) {
      if (!gstin) {
        if (country && country !== "India")
          return "Overseas";
        return "Unregistered";
      }
      if (TDS_REGEX.test(gstin))
        return "Tax Deductor";
      if (TCS_REGEX.test(gstin))
        return "Tax Collector";
      if (REGISTERED_REGEX.test(gstin))
        return "Registered Regular";
      if (UNBODY_REGEX.test(gstin))
        return "UIN Holders";
      if (OVERSEAS_REGEX.test(gstin))
        return "Overseas";
    },
    set_hsn_code_query(field) {
      if (!field || !gst_settings.validate_hsn_code)
        return;
      field.get_query = function() {
        const wildcard = "_".repeat(gst_settings.min_hsn_digits) + "%";
        return {
          filters: {
            name: ["like", wildcard]
          }
        };
      };
    },
    set_reconciliation_status(frm, field) {
      if (!frm.doc.docstatus === 1 || !frm.doc.reconciliation_status)
        return;
      const STATUS_COLORS = {
        Reconciled: "green",
        Unreconciled: "red",
        Ignored: "grey",
        "Not Applicable": "grey",
        "Match Found": "yellow"
      };
      const color = STATUS_COLORS[frm.doc.reconciliation_status];
      frm.get_field(field).set_description(
        `<div class="d-flex indicator ${color}">
                2A/2B Status:&nbsp;<strong>${frm.doc.reconciliation_status}</strong>
            </div>`
      );
    },
    validate_invoice_number(invoice_number) {
      let message_list = [];
      if (invoice_number.length > 16) {
        message_list.push("GST Invoice Number cannot exceed 16 characters");
      }
      if (!GST_INVOICE_NUMBER_FORMAT.test(invoice_number)) {
        message_list.push(
          "GST Invoice Number should start with an alphanumeric character and can only contain alphanumeric characters, dash (-) and slash (/)."
        );
      }
      return message_list;
    },
    trigger_file_download(file_content, file_name) {
      let type = "application/json;charset=utf-8";
      if (!file_name.endsWith(".json")) {
        type = "application/octet-stream";
      }
      const blob = new Blob([file_content], { type });
      const link = document.createElement("a");
      link.style.display = "none";
      link.href = URL.createObjectURL(blob);
      link.download = file_name;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(link.href);
        link.parentNode.removeChild(link);
      }, 0);
    },
    set_last_month_as_default_period(report) {
      report.filters.forEach((filter) => {
        if (filter.fieldname === "from_date") {
          filter.default = this.last_month_start();
        }
        if (filter.fieldname === "to_date") {
          filter.default = this.last_month_end();
        }
      });
    },
    last_month_start() {
      return frappe.datetime.add_months(frappe.datetime.month_start(), -1);
    },
    last_month_end() {
      return frappe.datetime.add_days(frappe.datetime.month_start(), -1);
    },
    primary_to_danger_btn(parent) {
      parent.$wrapper.find(".btn-primary").removeClass("btn-primary").addClass("btn-danger");
    },
    add_divider_to_btn_group(btn_group_name) {
      $(document).find(`.inner-group-button[data-label=${btn_group_name}]`).find(`.dropdown-menu`).append($('<li class="dropdown-divider"></li>'));
    },
    make_text_red(btn_group_name, btn_name) {
      $(document).find(`.inner-group-button[data-label=${btn_group_name}]`).find(`.dropdown-item[data-label="${encodeURIComponent(btn_name)}"]`).addClass("text-danger");
    },
    async authenticate_company_gstins(company, company_gstin) {
      const { message: gstin_authentication_status } = await frappe.call({
        method: "india_compliance.gst_india.utils.gstr_utils.validate_company_gstins",
        args: { company, company_gstin }
      });
      for (let gstin of Object.keys(gstin_authentication_status)) {
        if (gstin_authentication_status[gstin])
          continue;
        gstin_authentication_status[gstin] = await this.request_and_authenticate_otp(gstin);
      }
      return Object.keys(gstin_authentication_status);
    },
    async request_and_authenticate_otp(gstin) {
      await frappe.call({
        method: "india_compliance.gst_india.utils.gstr_utils.request_otp",
        args: { company_gstin: gstin }
      });
      await this.authenticate_otp(gstin);
    },
    async authenticate_otp(gstin, error_type = null) {
      if (!error_type)
        error_type = "otp_requested";
      let is_authenticated = false;
      while (!is_authenticated) {
        const otp = await this.get_gstin_otp(gstin, error_type);
        const { message } = await frappe.call({
          method: "india_compliance.gst_india.utils.gstr_utils.authenticate_otp",
          args: { company_gstin: gstin, otp }
        });
        if (message && ["otp_requested", "invalid_otp"].includes(message.error_type)) {
          error_type = message.error_type;
          continue;
        }
        is_authenticated = true;
        return true;
      }
    },
    show_dismissable_alert(wrapper, message, alert_type = "primary", on_close = null) {
      const alert = $(`
            <div class="container">
            <div
                class="alert alert-${alert_type} alert-dismissable fade show d-flex justify-content-between border-0"
                role="alert"
            >
                <div>${message}</div>
                <button
                    type="button"
                    class="close"
                    data-dismiss="alert"
                    aria-label="Close"
                    style="outline: 0px solid black !important"
                >
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            </div>
        `).prependTo(wrapper);
      alert.on("closed.bs.alert", () => {
        if (on_close)
          on_close();
      });
      return alert;
    }
  });
  function is_gstin_check_digit_valid(gstin) {
    const GSTIN_CODEPOINT_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const mod = GSTIN_CODEPOINT_CHARS.length;
    let factor = 2;
    let sum = 0;
    for (let i = gstin.length - 2; i >= 0; i--) {
      let codePoint = -1;
      for (let j = 0; j < GSTIN_CODEPOINT_CHARS.length; j++) {
        if (GSTIN_CODEPOINT_CHARS[j] === gstin[i]) {
          codePoint = j;
        }
      }
      let digit = factor * codePoint;
      factor = factor === 2 ? 1 : 2;
      digit = Math.floor(digit / mod) + digit % mod;
      sum += digit;
    }
    const checkCodePoint = (mod - sum % mod) % mod;
    return GSTIN_CODEPOINT_CHARS[checkCodePoint] === gstin[14];
  }
  window.ic = window.india_compliance;

  // ../india_compliance/india_compliance/public/js/quick_entry.js
  var GSTQuickEntryForm = class extends frappe.ui.form.QuickEntryForm {
    constructor(...args) {
      super(...args);
      this.skip_redirect_on_error = true;
      this.api_enabled = india_compliance.is_api_enabled() && gst_settings.autofill_party_info;
    }
    async setup() {
      await frappe.model.with_doctype("Address");
      super.setup();
    }
    render_dialog() {
      super.render_dialog();
      india_compliance.set_state_options(this.dialog);
    }
    get_address_fields() {
      return [
        {
          label: __("Primary Address Details"),
          fieldname: "primary_address_section",
          fieldtype: "Section Break",
          description: this.api_enabled ? __(
            `When you enter a GSTIN, the permanent address linked to it is
                        autofilled.<br>
                        Change the {0} to autofill other addresses.`,
            [frappe.meta.get_label("Address", "pincode")]
          ) : "",
          collapsible: 0
        },
        {
          fieldname: "is_primary_address",
          label: "Preferred Billing Address",
          fieldtype: "Check",
          default: 0
        },
        {
          fieldname: "_pincode",
          fieldtype: "Autocomplete",
          ignore_validation: true
        },
        {
          fieldname: "address_line1",
          fieldtype: "Data"
        },
        {
          fieldname: "address_line2",
          fieldtype: "Data"
        },
        {
          fieldtype: "Column Break"
        },
        {
          fieldname: "is_shipping_address",
          label: "Preferred Shipping Address",
          fieldtype: "Check",
          default: 0
        },
        {
          fieldname: "city",
          fieldtype: "Data"
        },
        {
          fieldname: "state",
          fieldtype: "Autocomplete",
          ignore_validation: true
        },
        {
          fieldname: "country",
          fieldtype: "Link",
          options: "Country",
          default: frappe.defaults.get_user_default("country"),
          onchange: () => {
            india_compliance.set_state_options(this.dialog);
          }
        }
      ];
    }
    get_gstin_field() {
      return [
        __spreadProps(__spreadValues({}, frappe.meta.get_docfield(this.doctype, "gstin")), {
          fieldname: "_gstin",
          fieldtype: "Autocomplete",
          description: this.api_enabled ? get_gstin_description() : "",
          ignore_validation: true,
          onchange: () => {
            const d = this.dialog;
            if (this.api_enabled && !gst_settings.sandbox_mode)
              return autofill_fields(d);
            d.set_value(
              "gst_category",
              india_compliance.guess_gst_category(d.doc._gstin, d.doc.country)
            );
          }
        })
      ];
    }
    update_doc() {
      const doc = super.update_doc();
      doc.pincode = doc._pincode;
      doc.gstin = doc._gstin;
      return doc;
    }
  };
  var PartyQuickEntryForm = class extends GSTQuickEntryForm {
    get_address_fields() {
      const fields = super.get_address_fields();
      for (const field of fields) {
        const fieldname = field.fieldname === "_pincode" ? "pincode" : field.fieldname;
        if (!field.label && fieldname) {
          field.label = frappe.meta.get_label("Address", fieldname);
        }
      }
      return fields;
    }
    render_dialog() {
      this.mandatory = [
        ...this.get_gstin_field(),
        ...this.mandatory,
        ...this.get_contact_fields(),
        ...this.get_address_fields()
      ];
      if (this.doctype === "Customer") {
        this.mandatory.push({
          label: __("Customer POS ID"),
          fieldname: "customer_pos_id",
          fieldtype: "Data",
          hidden: 1
        });
      }
      super.render_dialog();
    }
    get_contact_fields() {
      return [
        {
          label: __("Primary Contact Details"),
          fieldname: "primary_contact_section",
          fieldtype: "Section Break",
          collapsible: 0
        },
        {
          label: __("Email ID"),
          fieldname: "_email_id",
          fieldtype: "Data",
          options: "Email"
        },
        {
          fieldtype: "Column Break"
        },
        {
          label: __("Mobile Number"),
          fieldname: "_mobile_no",
          fieldtype: "Data"
        }
      ];
    }
    update_doc() {
      const doc = super.update_doc();
      doc._address_line1 = doc.address_line1;
      delete doc.address_line1;
      doc.email_id = doc._email_id;
      doc.mobile_no = doc._mobile_no;
      return doc;
    }
  };
  frappe.ui.form.CustomerQuickEntryForm = PartyQuickEntryForm;
  frappe.ui.form.SupplierQuickEntryForm = PartyQuickEntryForm;
  var AddressQuickEntryForm = class extends GSTQuickEntryForm {
    get_address_fields() {
      const fields = super.get_address_fields();
      const pincode_field = fields.find((field) => field.fieldname === "_pincode");
      for (const [key, value] of Object.entries(
        frappe.meta.get_docfield("Address", "pincode")
      )) {
        if (pincode_field[key] === void 0)
          pincode_field[key] = value;
      }
      return fields;
    }
    async render_dialog() {
      const address_fields = this.get_address_fields();
      const fields_to_exclude = address_fields.map(({ fieldname }) => fieldname);
      fields_to_exclude.push("pincode", "address_line1");
      this.mandatory = [
        ...this.get_dynamic_link_fields(),
        ...this.get_gstin_field(),
        ...this.mandatory.filter(
          (field) => !fields_to_exclude.includes(field.fieldname)
        ),
        ...address_fields
      ];
      super.render_dialog();
      this.set_default_values();
    }
    get_dynamic_link_fields() {
      return [
        {
          fieldname: "link_doctype",
          fieldtype: "Link",
          label: "Link Document Type",
          options: "DocType",
          get_query: () => {
            return {
              query: "frappe.contacts.address_and_contact.filter_dynamic_link_doctypes",
              filters: {
                fieldtype: "HTML",
                fieldname: "address_html"
              }
            };
          },
          onchange: async () => {
            const { value, last_value } = this.dialog.get_field("link_doctype");
            if (value !== last_value) {
              await this.dialog.set_value("link_name", "");
            }
          }
        },
        {
          fieldtype: "Column Break"
        },
        {
          fieldname: "link_name",
          fieldtype: "Dynamic Link",
          label: "Link Name",
          get_options: (df) => df.doc.link_doctype,
          onchange: async () => {
            const { link_doctype, link_name } = this.dialog.doc;
            if (!link_name || !in_list(frappe.boot.gst_party_types, link_doctype))
              return;
            const { message: gstin_list } = await frappe.call(
              "india_compliance.gst_india.utils.get_gstin_list",
              { party_type: link_doctype, party: link_name }
            );
            if (!gstin_list || !gstin_list.length)
              return;
            this.dialog.fields_dict._gstin.set_data(gstin_list.join("\n"));
          }
        },
        {
          fieldtype: "Section Break"
        }
      ];
    }
    update_doc() {
      const doc = super.update_doc();
      if (doc.link_doctype && doc.link_name) {
        const link = frappe.model.add_child(doc, "Dynamic Link", "links");
        link.link_doctype = doc.link_doctype;
        link.link_name = doc.link_name;
      }
      return doc;
    }
    async set_default_values() {
      const default_party = this.guess_default_party();
      if (default_party && default_party.party) {
        await this.dialog.set_value("link_doctype", default_party.party_type);
        this.dialog.set_value("link_name", default_party.party);
      }
    }
    guess_default_party() {
      const doc = cur_frm && cur_frm.doc;
      if (!doc)
        return;
      if (![
        ...frappe.boot.sales_doctypes,
        ...frappe.boot.purchase_doctypes,
        "Customer",
        "Supplier",
        "Company"
      ].includes(doc.doctype))
        return;
      let party_type = doc.doctype;
      let party = doc.name;
      if (frappe.dynamic_link && frappe.dynamic_link.doc === doc) {
        party_type = frappe.dynamic_link.doctype;
        party = frappe.dynamic_link.doc[frappe.dynamic_link.fieldname];
      }
      return {
        party_type,
        party
      };
    }
  };
  frappe.ui.form.AddressQuickEntryForm = AddressQuickEntryForm;
  var ItemQuickEntryForm = class extends frappe.ui.form.QuickEntryForm {
    render_dialog() {
      super.render_dialog();
      india_compliance.set_hsn_code_query(this.dialog.get_field("gst_hsn_code"));
      this.set_hsn_from_item_group();
    }
    set_hsn_from_item_group() {
      let item_group_field = this.dialog.fields_dict.item_group;
      item_group_field.df.onchange = async () => {
        const { message } = await frappe.db.get_value(
          "Item Group",
          item_group_field.value,
          "gst_hsn_code"
        );
        this.dialog.set_value("gst_hsn_code", message.gst_hsn_code);
      };
    }
  };
  frappe.ui.form.ItemQuickEntryForm = ItemQuickEntryForm;
  async function autofill_fields(dialog) {
    const gstin = dialog.doc._gstin;
    const gstin_field = dialog.get_field("_gstin");
    if (!gstin || gstin.length !== 15) {
      const pincode_field = dialog.fields_dict._pincode;
      pincode_field.set_data([]);
      pincode_field.df.onchange = null;
      gstin_field.set_description(get_gstin_description());
      return;
    }
    const gstin_info = await get_gstin_info(gstin);
    set_gstin_description(gstin_field, gstin_info.status);
    map_gstin_info(dialog.doc, gstin_info);
    dialog.refresh();
    setup_pincode_field(dialog, gstin_info);
  }
  function set_gstin_description(gstin_field, status) {
    if (!status) {
      gstin_field.set_description("");
      return;
    }
    gstin_field.set_description(india_compliance.get_gstin_status_desc(status));
  }
  function setup_pincode_field(dialog, gstin_info) {
    if (!gstin_info.all_addresses)
      return;
    const pincode_field = dialog.fields_dict._pincode;
    pincode_field.set_data(
      gstin_info.all_addresses.map((address) => {
        return {
          label: address.pincode,
          value: address.pincode,
          description: `${address.address_line1}, ${address.address_line2}, ${address.city}, ${address.state}`
        };
      })
    );
    pincode_field.df.onchange = () => {
      autofill_address(dialog.doc, gstin_info);
      dialog.refresh();
    };
  }
  function get_gstin_info(gstin, throw_error = true) {
    return frappe.call({
      method: "india_compliance.gst_india.utils.gstin_info.get_gstin_info",
      args: { gstin, throw_error }
    }).then((r) => r.message);
  }
  function map_gstin_info(doc, gstin_info) {
    if (!gstin_info)
      return;
    update_party_info(doc, gstin_info);
    if (gstin_info.permanent_address) {
      update_address_info(doc, gstin_info.permanent_address);
    }
  }
  function update_party_info(doc, gstin_info) {
    doc.gstin = doc._gstin;
    doc.gst_category = gstin_info.gst_category;
    if (!in_list(frappe.boot.gst_party_types, doc.doctype))
      return;
    const party_name_field = `${doc.doctype.toLowerCase()}_name`;
    doc[party_name_field] = gstin_info.business_name;
  }
  function update_address_info(doc, address) {
    if (!address)
      return;
    Object.assign(doc, address);
    doc._pincode = address.pincode;
  }
  function autofill_address(doc, { all_addresses }) {
    const { _pincode: pincode } = doc;
    if (!pincode || pincode.length !== 6 || !all_addresses)
      return;
    update_address_info(
      doc,
      all_addresses.find((address) => address.pincode == pincode)
    );
  }
  function get_gstin_description() {
    if (!gst_settings.sandbox_mode) {
      return __("Autofill party information by entering their GSTIN");
    }
    return __("Autofill is not supported in sandbox mode");
  }

  // ../india_compliance/india_compliance/public/js/transaction.js
  frappe.provide("india_compliance");
  var TRANSACTION_DOCTYPES = [
    "Quotation",
    "Sales Order",
    "Delivery Note",
    "Sales Invoice",
    "Purchase Order",
    "Purchase Receipt",
    "Purchase Invoice"
  ];
  var SUBCONTRACTING_DOCTYPES = [
    "Stock Entry",
    "Subcontracting Order",
    "Subcontracting Receipt"
  ];
  for (const doctype of TRANSACTION_DOCTYPES) {
    fetch_gst_details(doctype);
    validate_overseas_gst_category(doctype);
    set_and_validate_gstin_status(doctype);
  }
  for (const doctype of SUBCONTRACTING_DOCTYPES) {
    fetch_party_details(doctype);
    fetch_gst_details(doctype);
  }
  for (const doctype of ["Sales Invoice", "Delivery Note"]) {
    ignore_port_code_validation(doctype);
  }
  for (const doctype of ["Sales Invoice", "Sales Order", "Delivery Note"]) {
    set_e_commerce_ecommerce_supply_type(doctype);
  }
  function fetch_gst_details(doctype) {
    const event_fields = [
      "tax_category",
      "company_gstin",
      "place_of_supply",
      "is_reverse_charge"
    ];
    if (in_list(frappe.boot.sales_doctypes, doctype)) {
      event_fields.push(
        "customer_address",
        "shipping_address_name",
        "is_export_with_gst"
      );
    } else if (doctype === "Stock Entry") {
      event_fields.push("bill_from_gstin", "bill_to_address");
    } else if (["Subcontracting Order", "Subcontracting Receipt"].includes(doctype)) {
      event_fields.push("supplier_gstin");
    } else {
      event_fields.push("supplier_address");
    }
    const events = Object.fromEntries(
      event_fields.map((field) => [field, (frm) => update_gst_details(frm, field)])
    );
    frappe.ui.form.on(doctype, events);
  }
  async function update_gst_details(frm, event) {
    if (frm.updating_party_details || !frm.doc.company || ["place_of_supply", "bill_to_address"].includes(event) && frm.__updating_gst_details)
      return;
    const party_type = india_compliance.get_party_type(frm.doc.doctype).toLowerCase();
    const party_fieldname = frm.doc.doctype === "Quotation" ? "party_name" : party_type;
    const party = frm.doc[party_fieldname];
    if (!party)
      return;
    if ([
      "company_gstin",
      "bill_from_gstin",
      "bill_to_address",
      "customer_address",
      "shipping_address_name",
      "supplier_address"
    ].includes(event)) {
      frm.__update_place_of_supply = true;
    }
    if (frm.__gst_update_triggered)
      return;
    frm.__gst_update_triggered = true;
    const args = {
      doctype: frm.doc.doctype,
      company: frm.doc.company
    };
    await frappe.after_ajax();
    frm.__gst_update_triggered = false;
    if (frm.__update_place_of_supply) {
      args.update_place_of_supply = 1;
      frm.__update_place_of_supply = false;
    }
    const party_details = {};
    if (frm.doc.doctype !== "Quotation" || frm.doc.party_type === "Customer") {
      party_details[party_type] = party;
    }
    const fieldnames_to_set = [
      "tax_category",
      "gst_category",
      "company_gstin",
      "place_of_supply",
      "is_reverse_charge"
    ];
    if (in_list(frappe.boot.sales_doctypes, frm.doc.doctype)) {
      fieldnames_to_set.push(
        "customer_address",
        "shipping_address_name",
        "billing_address_gstin",
        "is_export_with_gst"
      );
    } else if (frm.doc.doctype === "Stock Entry") {
      fieldnames_to_set.push("bill_from_gstin", "bill_to_gstin", "bill_to_address");
    } else {
      fieldnames_to_set.push("supplier_address", "supplier_gstin");
    }
    for (const fieldname of fieldnames_to_set) {
      party_details[fieldname] = frm.doc[fieldname];
    }
    args.party_details = JSON.stringify(party_details);
    india_compliance.fetch_and_update_gst_details(frm, args);
  }
  india_compliance.fetch_and_update_gst_details = function(frm, args, method) {
    frappe.call({
      method: method || "india_compliance.gst_india.overrides.transaction.get_gst_details",
      args,
      async callback(r) {
        if (!r.message)
          return;
        frm.__updating_gst_details = true;
        await frm.set_value(r.message);
        frm.__updating_gst_details = false;
      }
    });
  };
  function validate_overseas_gst_category(doctype) {
    frappe.ui.form.on(doctype, {
      gst_category(frm) {
        const { enable_overseas_transactions } = gst_settings;
        if (!is_overseas_transaction(frm) || enable_overseas_transactions)
          return;
        frappe.throw(
          __("Please enable SEZ / Overseas transactions in GST Settings first")
        );
      }
    });
  }
  function is_overseas_transaction(frm) {
    if (frm.doc.gst_category === "SEZ")
      return true;
    if (frappe.boot.sales_doctypes)
      return is_foreign_transaction(frm);
    return frm.doc.gst_category === "Overseas";
  }
  function ignore_port_code_validation(doctype) {
    frappe.ui.form.on(doctype, {
      onload(frm) {
        frm.set_df_property("port_code", "ignore_validation", 1);
      }
    });
  }
  function is_foreign_transaction(frm) {
    return frm.doc.gst_category === "Overseas" && frm.doc.place_of_supply === "96-Other Countries";
  }
  function set_and_validate_gstin_status(doctype) {
    const gstin_field_name = frappe.boot.sales_doctypes.includes(doctype) ? "billing_address_gstin" : "supplier_gstin";
    frappe.ui.form.on(doctype, {
      refresh(frm) {
        if (frm.doc[gstin_field_name])
          _set_gstin_status(frm, gstin_field_name);
      },
      [gstin_field_name](frm) {
        _set_and_validate_gstin_status(frm, gstin_field_name);
      },
      gst_transporter_id(frm) {
        india_compliance.validate_gst_transporter_id(frm.doc.gst_transporter_id);
      },
      posting_date(frm) {
        if (frm.get_field("posting_date"))
          _set_and_validate_gstin_status(frm, gstin_field_name);
      },
      transaction_date(frm) {
        if (frm.get_field("transaction_date"))
          _set_and_validate_gstin_status(frm, gstin_field_name);
      }
    });
  }
  async function _set_and_validate_gstin_status(frm, gstin_field_name) {
    const gstin_doc = await _set_gstin_status(frm, gstin_field_name);
    if (!gstin_doc)
      return;
    validate_gstin_status(gstin_doc, frm, gstin_field_name);
  }
  async function _set_gstin_status(frm, gstin_field_name) {
    var _a;
    const gstin_field = frm.get_field(gstin_field_name);
    const gstin = gstin_field.value;
    const date_field = frm.get_field("posting_date") || frm.get_field("transaction_date");
    let gstin_doc = (_a = frm._gstin_doc) == null ? void 0 : _a[gstin];
    if (!gstin_doc) {
      gstin_doc = await india_compliance.set_gstin_status(
        gstin_field,
        date_field.value
      );
      frm._gstin_doc = frm._gstin_doc || {};
      frm._gstin_doc[gstin] = gstin_doc;
    } else {
      gstin_field.set_description(
        india_compliance.get_gstin_status_desc(
          gstin_doc == null ? void 0 : gstin_doc.status,
          gstin_doc == null ? void 0 : gstin_doc.last_updated_on
        )
      );
    }
    return gstin_doc;
  }
  function validate_gstin_status(gstin_doc, frm, gstin_field_name) {
    if (!gst_settings.validate_gstin_status)
      return;
    const date_field = frm.get_field("posting_date") || frm.get_field("transaction_date");
    const gstin_field = frm.get_field(gstin_field_name);
    const transaction_date = frappe.datetime.str_to_obj(date_field.value);
    const registration_date = frappe.datetime.str_to_obj(gstin_doc.registration_date);
    const cancelled_date = frappe.datetime.str_to_obj(gstin_doc.cancelled_date);
    if (!registration_date || transaction_date < registration_date)
      frappe.throw({
        message: __(
          "{0} is Registered on {1}. Please make sure that the {2} is on or after {1}",
          [
            gstin_field.df.label,
            frappe.datetime.str_to_user(gstin_doc.registration_date),
            date_field.df.label
          ]
        ),
        title: __("Invalid Party GSTIN")
      });
    if (gstin_doc.status === "Cancelled" && transaction_date >= cancelled_date)
      frappe.throw({
        message: __(
          "{0} is Cancelled from {1}. Please make sure that the {2} is before {1}",
          [
            gstin_field.df.label,
            frappe.datetime.str_to_user(gstin_doc.cancelled_date),
            date_field.df.label
          ]
        ),
        title: __("Invalid Party GSTIN")
      });
    if (!["Active", "Cancelled"].includes(gstin_doc.status))
      frappe.throw({
        message: __("Status of {0} is {1}", [
          gstin_field.df.label,
          gstin_doc.status
        ]),
        title: __("Invalid GSTIN Status")
      });
  }
  function set_e_commerce_ecommerce_supply_type(doctype) {
    const event_fields = ["ecommerce_gstin", "is_reverse_charge"];
    const events = Object.fromEntries(
      event_fields.map((field) => [
        field,
        (frm) => _set_e_commerce_ecommerce_supply_type(frm)
      ])
    );
    frappe.ui.form.on(doctype, events);
  }
  function _set_e_commerce_ecommerce_supply_type(frm) {
    if (!gst_settings.enable_sales_through_ecommerce_operators)
      return;
    if (!frm.doc.ecommerce_gstin) {
      frm.set_value("ecommerce_supply_type", "");
      return;
    }
    if (frm.doc.is_reverse_charge) {
      frm.set_value("ecommerce_supply_type", "Liable to pay tax u/s 9(5)");
    } else {
      frm.set_value("ecommerce_supply_type", "Liable to collect tax u/s 52(TCS)");
    }
  }
  function fetch_party_details(doctype) {
    let company_gstin_field = "company_gstin";
    if (doctype === "Stock Entry") {
      company_gstin_field = "bill_from_gstin";
    }
    frappe.ui.form.on(doctype, {
      supplier(frm) {
        setTimeout(() => {
          const party_details = {
            [company_gstin_field]: frm.doc[company_gstin_field],
            supplier: frm.doc.supplier
          };
          const args = {
            party_details: JSON.stringify(party_details),
            posting_date: frm.doc.posting_date || frm.doc.transaction_date
          };
          toggle_link_validation(frm, ["supplier_address"], false);
          erpnext.utils.get_party_details(
            frm,
            "india_compliance.gst_india.overrides.transaction.get_party_details_for_subcontracting",
            args,
            () => {
              toggle_link_validation(frm, ["supplier_address"], true);
            }
          );
        }, 0);
      }
    });
  }
  function toggle_link_validation(frm, fields, validate = true) {
    fields.forEach((field) => {
      const df = frm.get_field(field).df;
      if (df)
        df.ignore_link_validation = !validate;
    });
  }

  // ../india_compliance/india_compliance/public/js/audit_trail_notification.js
  $(document).on("app_ready", async function() {
    if (!frappe.boot.needs_audit_trail_notification)
      return;
    await new Promise((resolve) => setTimeout(resolve, 700));
    const d = frappe.msgprint({
      title: __("Configure Audit Trail"),
      indicator: "orange",
      message: __(
        `Dear India Compliance User,
            <br><br>

            In accordance with
            <a
              href='https://www.mca.gov.in/Ministry/pdf/AccountsAmendmentRules_24032021.pdf'
              target='_blank'
            >MCA Notification dated 24-03-2021</a>,
            all companies registered in India are required to maintain an Audit Trail
            of each and every transaction and creating an edit log of each change made
            in books of account w.e.f 1st April 2023.
            <br><br>
            To comply with this requirement, we have introduced a new setting called
            <strong>Enable Audit Trail</strong> in Accounts Settings.
            <br><br>
            <strong>Note:</strong>
            <ul>
                <li>Once this setting is enabled, it cannot be disabled.</li>
                <li>
                Enabling this setting will cause the following accounts setting
                to get disabled to ensure Audit Trail integrity:<br>
                <strong>
                Delete Accounting and Stock Ledger Entries on deletion of Transaction
                </strong>
                </li>
            </ul>


            Would you like to enable the same?`
      )
    });
    d.set_primary_action(__("Enable Audit Trail"), () => {
      frappe.call({
        method: "india_compliance.audit_trail.utils.enable_audit_trail",
        callback(r) {
          if (r.exc)
            return;
          frappe.show_alert({
            message: __("Audit Trail Enabled"),
            indicator: "green"
          });
        }
      });
      d.hide();
    });
    d.set_secondary_action_label(__("Review Accounts Settings"));
    d.set_secondary_action(() => {
      frappe.set_route("Form", "Accounts Settings");
      d.hide();
    });
    d.onhide = () => {
      frappe.xcall("india_compliance.audit_trail.utils.disable_audit_trail_notification");
    };
  });

  // ../india_compliance/india_compliance/public/js/item_tax_template_notification.js
  $(document).on("app_ready", async function() {
    if (!frappe.boot.needs_item_tax_template_notification)
      return;
    await new Promise((resolve) => setTimeout(resolve, 700));
    const d = frappe.msgprint({
      title: __("\u{1F6A8} Important: Changes to Item Tax Template"),
      indicator: "orange",
      message: __(
        `Dear India Compliance User,
            <br><br>

            We are pleased to inform you about a recent update on how Item Tax Templates are
            maintained in India Compliance App.
            <br><br>

            Migration Guide:
            <a
                href='https://docs.indiacompliance.app/docs/developer-guide/migration-guide#item-tax-templates'
                target='_blank'
            >Migrating Item Tax Template</a>
            <br><br>

            <strong>Breaking Change:</strong>
            <ul>
                <li>GST Category for Nil-Rated, Exempted and Non-GST is introduced in Item Tax Template</li>
                <li>Nil-Rated items are differentiated from Exempted for GST (configrable from Item Tax Template)</li>
                <li><strong>Assumption Made:</strong> All transactions that were marked as Nil or Exempt,
                are now marked as Nil-Rated.</li>
            </ul>

            <strong>Note:</strong>
            If the above assumptions are not valid for your organization, please update item tax templates
            accordingly for your items.
            `
      )
    });
    d.onhide = () => {
      frappe.xcall(
        "india_compliance.gst_india.utils.disable_item_tax_template_notification"
      );
    };
  });

  // ../india_compliance/india_compliance/public/js/quick_info_popover.js
  frappe.provide("india_compliance");
  india_compliance.quick_info_popover = class QuickInfoPopover {
    constructor(frm, field_dict) {
      this.frm = frm;
      this.field_dict = field_dict;
      this.make();
    }
    make() {
      this.create_info_popover();
    }
    create_info_popover() {
      if (!this.field_dict)
        return;
      for (const [field, info] of Object.entries(this.field_dict)) {
        this.create_info_icon(field);
        if (!this.info_btn)
          return;
        this.info_btn.popover({
          trigger: "hover",
          placement: "top",
          content: () => this.get_content_html(field, info),
          html: true
        });
      }
    }
    create_info_icon(field) {
      let field_area = this.frm.get_field(field).$wrapper.find(".clearfix");
      this.info_btn = $(`<i class="fa fa-info-circle"></i>`).appendTo(field_area);
    }
    get_content_html(field, info) {
      let field_lable = frappe.meta.get_label(this.frm.doctype, field);
      return `
			<div class="quick-info-popover">
				<div class="preview-field">
					<div class="preview-label text-muted">${__(field_lable)}</div>
					<hr>
					<div class="preview-value">${info}</div>
				</div>
			`;
    }
  };

  // ../india_compliance/india_compliance/public/js/custom_number_card.js
  var FrappeNumberCard = frappe.widget.widget_factory.number_card;
  var CustomNumberCard = class extends FrappeNumberCard {
    render_number() {
      if ([
        "Pending e-Waybill",
        "Pending e-Invoices",
        "Invoice Cancelled But Not e-Invoice"
      ].includes(this.card_doc.name) && !this.formatted_number)
        this.card_doc.color = null;
      super.render_number();
    }
  };
  frappe.widget.widget_factory.number_card = CustomNumberCard;

  // ../india_compliance/india_compliance/public/js/taxes_controller.js
  frappe.provide("india_compliance");
  frappe.provide("india_compliance.taxes_controller_events");
  india_compliance.taxes_controller = class TaxesController {
    constructor(frm, field_map) {
      this.frm = frm;
      this.field_map = field_map || {};
      this.setup();
    }
    setup() {
      this.fetch_round_off_accounts();
      this.set_item_tax_template_query();
      this.set_account_head_query();
    }
    fetch_round_off_accounts() {
      if (this.frm.doc.docstatus !== 0 || !this.frm.doc.company)
        return;
      frappe.call({
        method: "erpnext.controllers.taxes_and_totals.get_round_off_applicable_accounts",
        args: {
          company: this.frm.doc.company,
          account_list: []
        },
        callback(r) {
          if (r.message) {
            frappe.flags.round_off_applicable_accounts = r.message;
          }
        }
      });
    }
    set_item_tax_template_query() {
      this.frm.set_query("item_tax_template", "items", () => {
        return {
          filters: {
            company: this.frm.doc.company
          }
        };
      });
    }
    set_account_head_query() {
      this.frm.set_query("account_head", "taxes", () => {
        return {
          filters: {
            company: this.frm.doc.company,
            is_group: 0
          }
        };
      });
    }
    async process_tax_rate_update(cdt, cdn) {
      const row = locals[cdt][cdn];
      if (!row.charge_type || row.charge_type === "Actual")
        row.rate = 0;
      else {
        this.update_item_wise_tax_rates(row);
        await this.update_tax_amount(cdt, cdn);
      }
    }
    update_taxes() {
      if (this.frm.doc.taxes_and_charges) {
        return frappe.call({
          method: "erpnext.controllers.accounts_controller.get_taxes_and_charges",
          args: {
            master_doctype: frappe.meta.get_docfield(
              this.frm.doc.doctype,
              "taxes_and_charges",
              this.frm.doc.name
            ).options,
            master_name: this.frm.doc.taxes_and_charges
          },
          callback: async (r) => {
            if (!r.exc) {
              this.frm.set_value("taxes", r.message);
              await this.set_item_wise_tax_rates();
              this.update_tax_amount();
            }
          }
        });
      }
    }
    update_item_wise_tax_rates(tax_row) {
      let taxes;
      if (tax_row)
        taxes = [tax_row];
      else
        taxes = this.frm.doc.taxes;
      taxes.forEach((tax) => {
        const item_wise_tax_rates = JSON.parse(tax.item_wise_tax_rates || "{}");
        this.frm.doc.items.forEach((item) => {
          if (item.item_tax_template)
            return;
          item_wise_tax_rates[item.name] = tax.rate;
        });
        tax.item_wise_tax_rates = JSON.stringify(item_wise_tax_rates);
      });
    }
    async set_item_wise_tax_rates(item_name, tax_name) {
      if (!this.frm.doc.taxes || !this.frm.doc.taxes.length)
        return;
      await frappe.call({
        method: "india_compliance.gst_india.utils.taxes_controller.set_item_wise_tax_rates",
        args: {
          doc: this.frm.doc,
          item_name,
          tax_name
        }
      });
    }
    update_item_taxable_value(cdt, cdn) {
      const row = locals[cdt][cdn];
      let amount;
      const calculateAmount = (qty, rate, precisionType) => {
        return flt(flt(qty) * flt(rate), precision(precisionType, row));
      };
      if (this.frm.doc.doctype === "Subcontracting Receipt") {
        amount = calculateAmount(row.qty, row.rate, "amount");
      } else if (this.frm.doc.doctype === "Stock Entry") {
        amount = calculateAmount(row.qty, row.basic_rate, "basic_amount");
      }
      row.taxable_value = amount;
    }
    async update_tax_amount() {
      let total_taxes = 0;
      const total_taxable_value = this.calculate_total_taxable_value();
      this.frm.doc.taxes.forEach(async (row) => {
        var _a;
        if (!row.charge_type || row.charge_type === "Actual")
          return;
        row.tax_amount = this.get_tax_amount(row);
        if ((_a = frappe.flags.round_off_applicable_accounts) == null ? void 0 : _a.includes(row.account_head))
          row.tax_amount = Math.round(row.tax_amount);
        total_taxes += row.tax_amount;
        row.base_total = total_taxes + total_taxable_value;
      });
      this.frm.set_value(this.get_fieldname("total_taxes"), total_taxes);
      this.update_base_grand_total();
      this.frm.refresh_field("taxes");
    }
    update_base_grand_total() {
      const grand_total = this.calculate_total_taxable_value() + this.get_value("total_taxes");
      this.frm.set_value(this.get_fieldname("base_grand_total"), grand_total);
    }
    get_tax_amount(tax_row) {
      const item_wise_tax_rates = JSON.parse(tax_row.item_wise_tax_rates || "{}");
      return this.frm.doc.items.reduce((total, item) => {
        let multiplier = item.charge_type === "On Item Quantity" ? item.qty : item.taxable_value / 100;
        return total + multiplier * item_wise_tax_rates[item.name];
      }, 0);
    }
    calculate_total_taxable_value() {
      return this.frm.doc.items.reduce((total, item) => {
        return total + item.taxable_value;
      }, 0);
    }
    get_value(field, doc, default_value) {
      if (!default_value)
        default_value = 0;
      doc = doc || this.frm.doc;
      if (this.field_map[field])
        return doc[this.field_map[field]] || default_value;
      return doc[field] || default_value;
    }
    get_fieldname(field) {
      return this.field_map[field] || field;
    }
  };
  Object.assign(india_compliance.taxes_controller_events, {
    async item_tax_template(frm, cdt, cdn) {
      const row = locals[cdt][cdn];
      if (!row.item_tax_template)
        frm.taxes_controller.update_item_wise_tax_rates();
      else
        await frm.taxes_controller.set_item_wise_tax_rates(cdn);
      frm.taxes_controller.update_tax_amount();
    },
    qty(frm, cdt, cdn) {
      frm.taxes_controller.update_item_taxable_value(cdt, cdn);
      frm.taxes_controller.update_tax_amount();
    },
    item_code(frm, cdt, cdn) {
      frm.taxes_controller.update_item_taxable_value(cdt, cdn);
      frm.taxes_controller.update_tax_amount();
    },
    items_remove(frm) {
      frm.taxes_controller.update_tax_amount();
    }
  });
  frappe.ui.form.on("India Compliance Taxes and Charges", {
    rate(frm, cdt, cdn) {
      frm.taxes_controller.process_tax_rate_update(cdt, cdn);
    },
    tax_amount(frm, cdt, cdn) {
      frm.taxes_controller.update_tax_amount(cdt, cdn);
    },
    async account_head(frm, cdt, cdn) {
      await frm.taxes_controller.set_item_wise_tax_rates(null, cdn);
      frm.taxes_controller.update_tax_amount(cdt, cdn);
    },
    async charge_type(frm, cdt, cdn) {
      const row = locals[cdt][cdn];
      if (!row.charge_type) {
        row.rate = 0;
        row.item_wise_tax_rates = "{}";
        frm.refresh_field("taxes");
      } else {
        await frm.taxes_controller.set_item_wise_tax_rates(null, cdn);
        frm.taxes_controller.update_tax_amount(cdt, cdn);
      }
    }
  });
})();
//# sourceMappingURL=india_compliance.bundle.WNMWLREW.js.map
