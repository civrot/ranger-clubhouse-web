import Component from '@glimmer/component';
import EmberObject, {action, computed} from '@ember/object';
import {tracked} from '@glimmer/tracking';
import {Role} from 'clubhouse/constants/roles';
import {debounce} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {inject as controller} from '@ember/controller';

import RSVP from 'rsvp';

// How often in milliseconds should a search be performed as
// the user is typing.
const SEARCH_RATE_MS = 300;

const SearchFields = ['name', 'callsign', 'email', 'formerly_known_as'];

// Statuses to automatically exclude, unless included
const ExcludeStatus = ['auditor', 'past prospective'];

const MODE_ROUTES = {
  'account': 'person.index',
  'hq': 'hq.index',
  'timesheet': 'person.timesheet'
};

export default class SearchItemBarComponent extends Component {
  @service router;
  @service session;
  @service ajax;
  @service house;

  @controller('person') personController;
  @controller('hq') hqController;

  // Call from setCurrentUser in route after user has been authenticated
  @tracked searchForm = null;

  @tracked showSearchOptions = false;
  @tracked searchText = '';
  @tracked searchResults = [];
  @tracked searchType = 'person';

  constructor() {
    super(...arguments);

    const onduty = this.session.user.onduty_position;
    this.searchForm = EmberObject.create({
      query: '',
      name: true,
      callsign: true,
      email: true,
      formerly_known_as: true,

      auditor: false,
      past_prospective: false,

      mode: (onduty && (onduty.subtype === 'hq' || onduty.subtype === 'mentor')) ? 'hq' : 'account',
    });

    const searchPrefs = this.house.getKey('person-search-prefs');
    if (searchPrefs) {
      this.searchForm.setProperties(searchPrefs);
    }

   }

  /**
   * Save the search prefs when changed. The local store is used so the prefs persist in case the user
   * reloads the page.
   */

  @action
  searchFormChange() {
    this.house.setKey('person-search-prefs', this.searchForm);
  }


  /**
   * Build up the options for search type
   *
   * account - redirect to Person Manage
   * timesheet - redirect to the person timesheet management page
   * hq - redirect to the HQ Window interface
   *
   * @returns {[{id: search-mode, title: search label}]}
   */

  get modeOptions() {
    const user = this.session.user;
    const options = [{value: 'account', label: 'Person Manage'}];

    if (user.has_hq_window) {
      options.push({value: 'hq', label: 'HQ Window'});
    }

    if (user.hasRole([Role.ADMIN, Role.TIMESHEET_MANAGEMENT])) {
      options.push({value: 'timesheet', label: 'Timesheet Manage'});
    }

    return options;
  }

  /**
   * Called when the user changes the search mode.
   *
   * If the current route is a person or hq page, switch to the new view with displayed person.
   *
   * HQ Window workers were viewing a person in the wrong mode, and wanting to use options to
   * change the view instead of using the 'Switch to {HQ Window,Person}' link -- because
   * playa brain is a thing and interfaces get used in ways you never intended.

   * @param {string} mode
   */

  @action
  modeChange(mode) {
    this.searchForm.set('mode', mode);
    const route = this.router.currentRouteName;

    this.showSearchOptions = (this.searchForm.mode !== 'hq');

    if (!route.startsWith('person.') && !route.startsWith('hq.')) {
      return;
    }

    const person = route.startsWith('person') ? this.personController.person : this.hqController.person;

    if (!person) {
      return;
    }

    this.router.transitionTo((MODE_ROUTES[mode] || 'person.index'), person.id);
  }

  /**
   * Transition to the selected person/asset. Clear the query and results.
   *
   * @param item
   * @private
   */

  _showItem(item) {
    if (this.searchType === 'asset') {
      this.router.transitionTo('search.assets', {queryParams: {barcode: item.barcode, year: this.searchYear}});
    } else {
      this.router.transitionTo((MODE_ROUTES[this.searchForm.mode] || 'person.index'), item.id);
    }

    this.showSearchOptions = false;
    this.searchText = '';
    this.searchResults = [];
  }

  /*
   * Show the person when the user clicks on an option.
   */

  @action
  searchSelectAction(item) {
    if (item) {
      this._showItem(item);
    }
  }

  /*
   * As the user types, searchAction will be called. Queue up
   * the search once every SEARCH_RATE_MS milliseconds.
   *
   */

  @action
  searchAction(query) {
    return new RSVP.Promise((resolve, reject) => {
      debounce(this, this._performSearch, query, resolve, reject, SEARCH_RATE_MS);
    });
  }

  /*
   * Search for the person
   */

  _performSearch(query, resolve, reject) {
    query = query.trim();

    // query has to be two characters or more..
    if (query.length < 2) {
      return reject();
    }

    // Person id lookup
    let type;
    if (query.startsWith('#')) {
      type = 'asset'
    } else if (query.startsWith('+')) {
      type = 'person-id';
    } else {
      type = 'person';
    }

    this.searchType = type;

    if (type == 'asset') {
      this._searchAsset(query, resolve, reject);
    } else {
      this._searchPerson(query, resolve, reject);
    }
  }

  _searchAsset(query, resolve, reject) {
    let year, barcode;

    query = query.replace('#', '').replace(/ /g, '');
    if (query.includes(':')) {
      [barcode, year] = query.split(':');
      if (year.length != 4) {
        return resolve([]);
      }
    } else {
      barcode = query;
      year = this.house.currentYear();
    }

    this.searchYear = year;

    this.ajax.request('asset', {data: {barcode, year}})
      .then((results) => {
        if (results.asset.length == 0) {
          return resolve([]);
        }

        const asset = results.asset.firstObject;
        const searchResults = [{
          barcode: asset.barcode,
          description: asset.description,
          type: asset.temp_id,
        }];

        this.searchResults = searchResults;
        return resolve(searchResults);
      }).catch((response) => {
      this.house.handleErrorResponse(response);
      return reject();
    });
  }

  _searchPerson(query, resolve, reject) {
    const form = this.searchForm;

    const params = {
      basic: 1,
      query
    };

    if (form.mode === 'hq') {
      // restrict search to callsign and a handful of active-like statuses
      params.search_fields = 'callsign';
      params.statuses = 'active,alpha,prospective,retired,non ranger,inactive,inactive extension';
    } else {
      // Find out which fields to search
      const search_fields = [];
      SearchFields.forEach((field) => {
        if (form[field]) {
          search_fields.push(field);
        }
      });

      if (search_fields.length > 0) {
        params.search_fields = search_fields.join(',');
      }

      // By default, certain status are exclude.
      // The take status off the list if the user wants
      // those included
      const toExclude = ExcludeStatus.slice();

      if (form.auditor) {
        toExclude.removeObject('auditor');
      }

      if (form.past_prospective) {
        toExclude.removeObject('past prospective');
      }

      if (toExclude.length > 0) {
        params.exclude_statuses = toExclude.join(',');
      }
    }

    // And fire away!
    return this.ajax.request('person', {
      data: params
    }).then((results) => {
      const people = results.person;
      this.searchResults = people;
      return resolve(people);
    }).catch((response) => {
      this.house.handleErrorResponse(response);
      return reject();
    });
  }

  @action
  searchFocusAction() {
    this.searchResults = [];
    this.searchYear = null;
    this.showSearchOptions = (this.searchForm.mode !== 'hq');
  }

  @action
  hideSearchBoxAction() {
    this.showSearchOptions = false;
  }

  @computed('searchForm.{name,callsign,email,formerly_known_as,mode}')
  get searchPlaceholder() {
    const form = this.searchForm;

    const fields = [];

    if (form.mode === 'hq') {
      fields.push('callsign');
    } else {
      if (form.callsign) {
        fields.push('callsign');
      }

      if (form.name) {
        fields.push('name');
      }

      if (form.email) {
        fields.push('email');
      }

      if (form.formerly_known_as) {
        fields.push('fka');
      }
    }

    fields.push('#barcode');

    const arrayToSentence = (a, conjunction) => [a.slice(0, -1).join(', '), a.pop()].filter(w => w !== '').join(` ${conjunction} `);

    return `Enter a ${arrayToSentence(fields, 'or')} to search`;
  }

}
