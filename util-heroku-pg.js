const { Client } = require('pg');
const { readConfigurationFromFile } = require('./util-file');

const createConfigurationIfNotExists = () => {
  hasConfiguration((error) => {
    if (error) {
      const client = createClient();

      client
        .connect()
        .then(() => {
          return createTableIfNotExists(client);
        })
        .then((result) => {
          return truncateTable(client);
        })
        .then((result) => {
          return readConfigurationFromFile();
        })
        .then((configurationAsString) => {
          return writeConfiguration(client, configurationAsString);
        })
        .then((result) => {
          console.log('table successfully created, configuration saved');
          process.exit(0);
        })
        .catch((error) => {
          console.log(error);
          process.exit(1);
        })
        .then(() => client.end());
    }
  });
};

const hasConfiguration = (callback) => {
  const client = createClient();

  client
    .connect()
    .then(() => {
      return checkIfTableExists(client);
    })
    .then((result) => {
      if (result.rows[0].exists === true) {
        callback(null);
      } else {
        callback(new Error('table does not exist'));
      }
    })
    .catch((error) => {
      return callback(error);
    })
    .then(() => client.end());
};

const getConfiguration = (callback) => {
  const client = createClient();

  client
    .connect()
    .then(() => {
      return readConfiguration(client);
    })
    .then((result) => {
      if (result.rows.length === 1) {
        callback(null, JSON.parse(result.rows[0].data));
      } else {
        callback(new Error(`configuration invalid, ${result.rows.length} rows found`));
      }
    })
    .catch((error) => {
      return callback(error);
    })
    .then(() => client.end());
};

const setConfiguration = (configuration, callback) => {
  const configurationAsString = JSON.stringify(configuration, null, 4);

  const client = createClient();

  client
    .connect()
    .then(() => {
      return truncateTable(client);
    })
    .then((result) => {
      return writeConfiguration(client, configurationAsString);
    })
    .then((result) => {
      return callback(null);
    })
    .catch((error) => {
      console.log(error);
      return callback(error);
    })
    .then(() => client.end());
};

const createClient = () => {
  return new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
};

const checkIfTableExists = (client) => {
  return client.query(
    "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'configuration')"
  );
};

const createTableIfNotExists = (client) => {
  return client.query('CREATE TABLE IF NOT EXISTS configuration (id serial, data text)');
};

const truncateTable = (client) => {
  return client.query('TRUNCATE configuration');
};

const writeConfiguration = (client, configuration) => {
  const query = {
    text: 'INSERT INTO configuration(data) values($1)',
    values: [configuration]
  };

  return client.query(query);
};

const readConfiguration = (client) => {
  return client.query('SELECT * FROM configuration');
};

module.exports = {
  createConfigurationIfNotExists,
  getConfiguration,
  setConfiguration
};
