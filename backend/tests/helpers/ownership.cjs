// Other regression suites have no configured ownership database. Stub only that lookup.
require('../../dist/models/PlatformOwnership').default.findById = async () => null;
