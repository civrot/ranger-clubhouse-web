import Component from '@glimmer/component';
import {action} from '@ember/object';
import {Role} from 'clubhouse/constants/roles';
import {validatePresence} from 'ember-changeset-validations/validators';
import validateDateTime from 'clubhouse/validators/datetime';
import {tracked} from '@glimmer/tracking';
import {inject as service} from '@ember/service';

export default class PersonTimesheetManageComponent extends Component {
  @service ajax;
  @service house;
  @service modal;
  @service session;
  @service toast;

  @tracked editEntry = null;
  @tracked editVerification = false;

  reviewOptions = [
    'approved',
    'rejected',
    'pending'
  ];

  verifyOptions = [
    ['Is verified', true],
    ['is NOT verified', false]
  ];

  timesheetValidations = {
    on_duty: [validateDateTime({before: 'off_duty'}), validatePresence({presence: true})],
    off_duty: [validateDateTime({after: 'on_duty'})],
  };

  // Build a position list the person can be in.
  get positionOptions() {
    return this.args.positions.map((p) => [p.title, p.id]);
  }

  // Is the user allowed to manage timesheets (edit, delete, review)
  get canManageTimesheets() {
    const user = this.session.user;
    return user.hasRole(Role.TIMESHEET_MANAGEMENT) || (user.hasRole(Role.ADMIN) && user.hasRole(Role.MANAGE));
  }

  // Can the user verify the person's timesheet?
  get canVerifyTimesheets() {
    return this.session.user.hasRole(Role.MANAGE);
  }

  // Edit a timesheet - i.e. display the form
  @action
  editEntryAction(timesheet) {
    timesheet.reload().then(() => {
      this.editVerification = false;
      this.editEntry = timesheet;
    }).catch((response) => this.house.handleErrorResponse(response));
  }

  // Cancel editing - i.e. hide the form
  @action
  cancelEntryAction() {
    this.editEntry = null;
  }

  // Save the timesheet entry being edited
  @action
  saveEntryAction(model, isValid) {
    if (!isValid) {
      return;
    }

    this.house.saveModel(model, 'The timesheet entry has been successfully updated.',
      () => {
        this.editEntry = null;
        this.args.onChange();
      });
  }

  // Signoff the person from a shift.
  @action
  signoffAction(timesheet) {
    this.ajax.request(`timesheet/${timesheet.id}/signoff`, {method: 'POST'})
      .then((result) => {
        const person = this.args.person;
        this.timesheets.update();
        this.args.onChange();
        if (this.person.id == this.session.userId) {
          this.session.loadUser();
        }
        switch (result.status) {
          case 'success':
            this.toast.success(`${person.callsign} has been successfully signed off. Enjoy your rest.`);
            break;

          case 'already-signed-off':
            this.toast.error(`${person.callsign} was already signed off.`);
            break;

          default:
            this.toast.error(`Unknown signoff response [${result.status}].`);
            break;
        }
      });
  }

  // Delete the entry.
  @action
  removeEntryAction(timesheet) {
    this.modal.confirm('Remove Timesheet',
      `Position: ${timesheet.position.title}<br>Time: ${timesheet.on_duty} to ${timesheet.off_duty}<br> Are you sure you wish to remove this timesheet?`,
      () => {
        timesheet.destroyRecord().then(() => {
          this.toast.success('The entry has been deleted.');
          this.args.onChange();
        }).catch((response) => this.house.handleErrorResponse(response));
      });
  }

  // Display the verification fields.
  @action
  editVerificationAction() {
    this.editVerification = true;
  }
}
