import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Route | mentor/assignment', function(hooks) {
  setupTest(hooks);

  test('it exists', function(assert) {
    let route = this.owner.lookup('route:mentor/assignment');
    assert.ok(route);
  });
});
