import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class ReportsSpecialTeamsController extends Controller {
  @tracked isSubmitting = false;
  @tracked haveResults = false;
  @tracked startYear;
  @tracked endYear;
  @tracked positionsUsed;
  @tracked totalsList;
  @tracked grandTotal;
  @tracked people;

  get positionOptions() {
    return this.positions.map((p) => [p.title, p.id]);
  }

  get yearOptions() {
    const endYear = this.house.currentYear();

    const years = [];
    for (let year = endYear; year >= 2010; year--) {
      years.push(year);
    }
    return years;
  }

  get yearList() {
    const start = this.startYear, end = this.endYear;

    const years = [];
    for (let year = start; year <= end; year++) {
      years.push(year);
    }

    return years;
  }

  @action
  searchTeamsAction() {
    const form = this.teamsForm;
    const position_ids = form.positionIds,
        include_inactive = form.showInactives ? 1 : 0,
        start_year = parseInt(form.startYear),
        end_year = parseInt(form.endYear);

    if (position_ids.length == 0) {
      this.modal.info(null, 'No team/positions were selected.');
      return;
    }

    if (start_year > end_year) {
      this.modal.info(null, 'The starting year must be less than or equal to the ending year.');
      return;
    }

    this.isSubmitting = true;
    this.ajax.request('timesheet/special-teams', { method: 'POST', data: { position_ids, include_inactive, start_year, end_year }})
      .then((result) => {
        this.people = result.people;
        this.haveResults = true;
        this.startYear = start_year;
        this.endYear = end_year;

        this.positionsUsed =  this.positions.filter((p) => position_ids.includes(p.id));

        const years = (end_year - start_year)+1;
        const totals = new Array(years);

        for (let i = 0; i < years; i++) {
          totals[i] = 0;
        }

        this.people.forEach((p) => {
          p.years.forEach((total, idx) => {
            totals[idx] += total;
          });
        });

        this.totalsList = totals;
        this.grandTotal = this.people.reduce((total, p) => p.total_duration + total, 0);
      }).catch((response) => this.house.handleErrorResponse(response))
      .finally(() => this.isSubmitting = false);
  }

  @action
  exportToCSV() {
    const columns = [
      { title: 'Callsign', key: 'callsign' },
      { title: 'Name', key: 'name' },
      { title: 'Status', key: 'status' },
      { Title: 'Email', key: 'email' }
    ];

    this.yearList.forEach((year) => {
      columns.push({ title: `${year} Hours`, key: year.toString() });
    });

    columns.push({ title: 'Total', key: 'total' });

    const rows = this.people.map((person) => {
      const row = {
        callsign: person.callsign,
        name: `${person.first_name} ${person.last_name}`,
        status: person.status,
        email: person.email,
        total: (person.total_duration / 3600.0).toFixed(2)
      };

      this.yearList.forEach((year, idx) => {
        row[year.toString()] = (person.years[idx] / 3600.0).toFixed(2);
      });

      return row;
    });

    this.house.downloadCsv(`special-teams-${this.startYear}-${this.endYear}`, columns, rows);
  }
}
