import Route from '@ember/routing/route';
import AuthenticatedRouteMixin from 'ember-simple-auth/mixins/authenticated-route-mixin';
import { Role } from 'clubhouse/constants/roles';

// Namespace route - nothing really happening here other than to
// verify the user has the right role

export default class ReportsRoute extends Route.extend(AuthenticatedRouteMixin) {
  beforeModel() {
    super.beforeModel(...arguments);
    this.house.roleCheck([ Role.ADMIN, Role.MANAGE ]);
  }

  // Don't allow the year parameter to bleed over to other routes.
  resetController(controller, isExiting) {
    if (isExiting) {
      controller.set('year', null);
    }
  }
}
