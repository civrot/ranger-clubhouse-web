import Controller from '@ember/controller';
import { isEmpty } from '@ember/utils';
import { action, computed } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class AdminSettingsController extends Controller {
  booleanOptions = [ 'true', 'false' ];

  @tracked editSetting = null;
  @tracked filterByName = '';

  _isValidJson(value) {
    if (isEmpty(value)) {
      return true;
    }

    try {
      const json = JSON.parse(value);
      return (typeof json === 'object');
    } catch (e) {
      return false;
    }
  }

  @computed('settings.[]', 'filterByName')
  get viewSettings() {
    let name = this.filterByName;
    if (name) {
      name = name.trim();
    }

    if (isEmpty(name)) {
      return this.settings;
    }
    return this.settings.filter((s) => RegExp(name, 'i').test(s.name) );
  }

  @computed('editSetting.options')
  get editOptions() {
    if (!this.editSetting.options) {
      return null;
    }

    return this.editSetting.options.map((opt) => [ opt[1], opt[0] ]);
  }

  @action
  edit(setting) {
    this.editSetting = setting;
  }

  @action
  save(model, isValid) {
    if (!isValid)
      return;

    if (model.type == 'json' && !this._isValidJson(model.value)) {
      this.toast.error('The JSON blob does not appear to be valid. Sorry.');
      return;
    }

    model.save().then(() => {
      this.editSetting = null;
      this.toast.success(`The setting value has been successfully update.`);
    }).catch((response) => this.house.handleErrorResponse(response, model));
  }

  @action
  cancel() {
    this.editSetting = null;
  }

  @action
  filterSettings(name) {
    this.filterByName = name;
  }

  @action
  clearFilter() {
    this.filterByName = '';
  }
}
