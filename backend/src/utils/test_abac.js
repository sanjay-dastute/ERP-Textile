const { engine } = require('../middleware/accessControl.middleware');

const runTests = () => {
    console.log('--- Testing ABAC Engine ---');

    console.log('\nScenario 1: Admin Access');
    const admin = { role: 'admin' };
    const res1 = engine.check(admin, 'order', 'delete', {});
    console.log(`Admin can delete order: ${res1} (Expected: true)`);

    console.log('\nScenario 2: Manager Access (Same Org)');
    const manager = { role: 'manager', organization: 'org1' };
    const resourceSameOrg = { organization: 'org1' };
    const res2 = engine.check(manager, 'order', 'read', resourceSameOrg);
    console.log(`Manager can read same org order: ${res2} (Expected: true)`);

    console.log('\nScenario 3: Manager Access (Diff Org)');
    const resourceDiffOrg = { organization: 'org2' };
    const res3 = engine.check(manager, 'order', 'read', resourceDiffOrg);
    console.log(`Manager can read diff org order: ${res3} (Expected: false)`);

    console.log('\nScenario 4: Staff Access (Inactive)');
    const staffInactive = { role: 'staff', isActive: false, organization: 'org1' };
    const res4 = engine.check(staffInactive, 'order', 'create', resourceSameOrg);
    console.log(`Inactive staff can create order: ${res4} (Expected: false)`);

    console.log('\nScenario 5: Staff Access (Active)');
    const staffActive = { role: 'staff', isActive: true, organization: 'org1' };
    const res5 = engine.check(staffActive, 'order', 'create', resourceSameOrg);
    console.log(`Active staff can create order: ${res5} (Expected: true)`);
};

runTests();
