import { module, skip /* test */ } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Route | vc/access-documents/trs', function(hooks) {
  setupTest(hooks);

  skip('it exists', function(assert) {
    let route = this.owner.lookup('route:vc/access-documents/trs');
    assert.ok(route);
  });
});
