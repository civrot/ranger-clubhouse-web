import Route from '@ember/routing/route';
import MeRouteMixin from 'clubhouse/mixins/route/me';

export default class MePasswordRoute extends Route.extend(MeRouteMixin) {
  setupController(controller) {
    super.setupController(...arguments);
    controller.set('password', {
      password_old: '',
      password: '',
      password_confirmation: ''
    });
  }
}
