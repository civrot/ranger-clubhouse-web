import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Route | person/external-ids', function(hooks) {
  setupTest(hooks);

  test('it exists', function(assert) {
    let route = this.owner.lookup('route:person/external-ids');
    assert.ok(route);
  });
});
