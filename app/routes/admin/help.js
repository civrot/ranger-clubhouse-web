import Route from '@ember/routing/route';
import { Role } from 'clubhouse/constants/roles';

export default class AdminHelpRoute extends Route {
  queryParams = {
    editSlug: { replace: true },
    createSlug: { replace: true }
  };

  beforeModel() {
    super.beforeModel(...arguments);

    this.house.roleCheck(Role.ADMIN);
  }

  model({ createSlug, editSlug }) {
    this.store.unloadAll('help');
    this.set('createSlug', createSlug);
    this.set('editSlug', editSlug);

    return this.store.query(`help`, { }).then((result) => result.toArray());
  }

  setupController(controller, model) {
    controller.set('documents', model);

    const createSlug = this.createSlug;
    if (createSlug) {
      controller.set('entry', this.store.createRecord('help', { slug: createSlug }));
      controller.set('createSlug', null);
    } else if (this.editSlug) {
      const slug = this.editSlug;
      const entry = model.find((h) => h.slug == slug);
      controller.set('entry', entry);
      controller.set('editSlug', null);
    }
  }

  resetController(controller, isExiting) {
    if (isExiting) {
      this.set('createTag', null);
      this.set('entry', null);
    }
  }
}
