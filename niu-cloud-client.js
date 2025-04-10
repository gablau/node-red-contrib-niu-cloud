/* eslint-disable no-shadow */
/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
const niuCloudConnector = require('niu-cloud-connector');

// eslint-disable-next-line func-names
module.exports = function (RED) {
  function NiuCloudClientNode(conf) {
    const node = this;
    RED.nodes.createNode(this, conf);

    this.niu_user = (this.credentials) ? this.credentials.niu_user : 'n/a';
    this.niu_password = (this.credentials) ? this.credentials.niu_password : 'n/a';
    this.vehicleSN = (this.credentials) ? this.credentials.vehicleSN : 'n/a';

    this.token = false;
    this.dbg_low = conf.dbg_low;
    this.dbg_cloud = conf.dbg_cloud;
    this.name = conf.name;
    this.cloud = new niuCloudConnector.Client();
    if (this.dbg_cloud) {
      this.cloud.enableDebugMode(true);
    }

    this.REFRESH_TOKEN_TIMEOUT_SECONDS = 3;

    this.dbglog = (msg, data) => {
      if (node.dbg_low) {
        node.log(msg);
        if (data !== undefined) {
          if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
            node.log(data);
          } else {
            node.log(JSON.stringify(data, null, ' '));
          }
        }
      }
    };


    this.getToken = () => node.token;

    this.statusCloudConnected = () => {
      node.emit('cloud-connected');
      node.dbglog('Cloud Connected');
    };

    this.statusCloudDisconnected = () => {
      node.emit('cloud-disconnected');
      node.dbglog('Cloud Disconnected');
    };

    this.tokenError = () => {
      node.statusCloudDisconnected();
      node.log('Try to refresh token...');
      setTimeout(() => {
        node.refreshToken();
      }, node.REFRESH_TOKEN_TIMEOUT_SECONDS * 1000); // try to reconnect
    };


    this.refreshToken = () => {
      const loginData = {
        account: node.niu_user,
        password: node.niu_password,
      };
      node.dbglog('Refresh Token...');
      node.cloud.createSessionToken(
        loginData,
      ).then((result) => {
        const logToken = `***********${result.result.substring(result.result.length - 8)}`; // hide full token from logs
        node.dbglog(`  ...Token created: ${logToken}`);
        node.token = result.result;
        node.statusCloudConnected();
      }).catch((err) => {
        node.log('  ...Login error - Bad credential');
        node.token = false;
        node.statusCloudDisconnected();
      });
    };

    this.refreshToken();
  }
  RED.nodes.registerType('niu-cloud-client', NiuCloudClientNode, {
    credentials: {
      niu_user: { type: 'text' },
      niu_password: { type: 'password' },
      vehicleSN: { type: 'text' },
    },
  });

  // refresh token
  RED.httpAdmin.post('/niu/token/:id', RED.auth.needsPermission('niu-cloud.write'), (req, res) => {
    const node = RED.nodes.getNode(req.params.id);
    const data = req.body;
    let pwd = data.niu_password;

    if (pwd === '__PWRD__' && node.credentials) {
      pwd = node.credentials.niu_password;
    }

    const loginData = {
      account: data.niu_user,
      password: pwd,
    };

    const cloud = new niuCloudConnector.Client();

    cloud.createSessionToken(
      loginData,
    ).then((result) => {
      const newToken = result.result;
      const logToken = `***********${newToken.substring(newToken.length - 8)}`; // hide full token from logs
      console.log(`Session token created: ${logToken}`);

      // retrive vehicles
      cloud.setSessionToken({
        token: newToken,
      }).then((result) => result.client.getVehicles())
        .then((result) => {
          const vehicles = result.result;
          const list = [];
          vehicles.forEach((vehicle) => list.push({ sn: vehicle.sn, type: vehicle.type, name: vehicle.name }));
          res.json(list).end();
        }).catch((err) => {
          console.log('err', err);
          const resdata = {
            error: 'No vehicles',
          };
          res.status(404).json(resdata);
        });
    }).catch((err) => {
      console.log('Login error - Bad credential');
      const resdata = {
        error: 'Bad credential',
      };
      res.status(401).json(resdata);
    });
  });

  // refresh vehicles list
  RED.httpAdmin.get('/niu/vehicles/:id', RED.auth.needsPermission('niu-cloud.write'), (req, res) => {
    const node = RED.nodes.getNode(req.params.id);

    if (node === undefined || node === null) {
      res.status(400).json({}).end();
      return;
    }

    node.cloud.setSessionToken({
      token: node.token,
    }).then((result) => result.client.getVehicles()).then((result) => {
      const vehicles = result.result;
      const list = [];
      vehicles.forEach((vehicle) => list.push({ sn: vehicle.sn, type: vehicle.type, name: vehicle.name }));
      res.json(list).end();
    }).catch((err) => {
      const resdata = {
        error: 'No vehicles',
      };
      res.status(404).json(resdata);
    });
  });
};
