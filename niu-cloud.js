/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
// eslint-disable-next-line func-names
module.exports = function (RED) {
  function NiuCloudNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    this.client = RED.nodes.getNode(config.client);

    this.dbglog = (msg, data) => {
      if (node.client.dbg_low) {
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

    node.status({
      fill: 'grey',
      shape: 'ring',
      text: 'Unknown',
    });

    // Handle status
    if (this.client) {
      this.client.on('cloud-connected', () => {
        node.status({
          fill: 'green',
          shape: 'dot',
          text: 'Connected',
        });
      });

      this.client.on('cloud-disconnected', () => {
        node.status({
          fill: 'red',
          shape: 'ring',
          text: 'Connection error',
        });
      });
    }

    // handle cloud request error
    function handleCloudRequestError(error, name) {
      node.client.dbglog(`Niu cloud Request Error on ${name}: `, error);
      if (typeof error === 'object') {
        if (typeof error.debug === 'object') {
          node.client.dbglog(`Debug: ${error.debug.date} ${error.debug.funcName}`);
        }

        if (typeof error.error === 'object') {
          if (error.error === null) {
            node.client.dbglog('Error: Unknown');
          } else if (typeof error.error.message === 'string') {
            node.client.dbglog(`Error: ${error.error.message}`);
          } else {
            node.client.dbglog('Error: ');
            node.client.dbglog(JSON.stringify(error.error, null, 4));
          }
        } else if (typeof error.message === 'string') {
          node.client.dbglog('Error:');
          node.client.dbglog(error.message);
        } else {
          node.client.dbglog('Internal error: Unsupported error');
          node.client.dbglog(JSON.stringify(error, null, 4));
        }
      } else {
        node.client.dbglog('Error: Unknown');
      }

      // check if token error
      if (error !== undefined && error.error !== undefined && error.error.message !== undefined) {
        if (error.error.message.indexOf('TOKEN ERROR') > 0) {
          node.client.tokenError();
        }
      }

      error.niuCloud = name;
      node.error(error);
    }

    function cloudLog(result, name) {
      if (typeof result === 'object') {
        const res = { ...result };
        if (res.client !== undefined && res.client._token !== undefined) {
          // hide full token from logs
          res.client._token = `***********${res.client._token.substring(res.client._token.length - 8)}`;
        }
        node.client.dbglog(`cloudLog "${name}"`, res);
      } else {
        node.client.dbglog(`cloudLog "${name}"`, result);
      }
      return Promise.resolve(result);
    }

    // all niu method

    function getVehicles(msg, send, done) {
      const name = 'vehicles';
      node.client.cloud.setSessionToken({
        token: node.client.getToken(),
      }).then((result) => result.client.getVehicles())
        .then((result) => cloudLog(result, name))
        .then((result) => {
          const vehicles = result.result;
          msg.payload = vehicles[0];
          send(msg);
          if (done) { done(); }
        })
        .catch((err) => {
          handleCloudRequestError(err, name);
        });
    }



    function getMotorInfo(msg, send, done) {
      const name = 'motor-info';
      node.client.cloud.setSessionToken({
        token: node.client.getToken(),
      }).then((result) => result.client.getMotorInfo({
        sn: node.client.vehicleSN,
      })).then((result) => cloudLog(result, name))
        .then((result) => {
          const motorInfo = result.result;
          msg.payload = motorInfo;
          send(msg);
          if (done) { done(); }
        })
        .catch((err) => {
          handleCloudRequestError(err, name);
        });
    }

    function getOverallTally(msg, send, done) {
      const name = 'overall-tally';
      node.client.cloud.setSessionToken({
        token: node.client.getToken(),
      }).then((result) => result.client.getOverallTally({
        sn: node.client.vehicleSN,
      })).then((result) => cloudLog(result, name))
        .then((result) => {
          const batteryInfo = result.result;
          msg.payload = batteryInfo;
          send(msg);
          if (done) { done(); }
        })
        .catch((err) => {
          handleCloudRequestError(err, name);
        });
    }

    function getBatteryInfo(msg, send, done) {
      const name = 'battery-info';
      node.client.cloud.setSessionToken({
        token: node.client.getToken(),
      }).then((result) => result.client.getBatteryInfo({
        sn: node.client.vehicleSN,
      })).then((result) => cloudLog(result, name))
        .then((result) => {
          const batteryInfo = result.result;
          msg.payload = batteryInfo;
          send(msg);
          if (done) { done(); }
        })
        .catch((err) => {
          handleCloudRequestError(err, name);
        });
    }

    function getBatteryHealth(msg, send, done) {
      const name = 'battery-health';
      node.client.cloud.setSessionToken({
        token: node.client.getToken(),
      }).then((result) => result.client.getBatteryHealth({
        sn: node.client.vehicleSN,
      })).then((result) => cloudLog(result, name))
        .then((result) => {
          const batteryHealth = result.result;
          msg.payload = batteryHealth;
          send(msg);
          if (done) { done(); }
        })
        .catch((err) => {
          handleCloudRequestError(err, name);
        });
    }

    function getFirmwareVersion(msg, send, done) {
      const name = 'fw-version';
      node.client.cloud.setSessionToken({
        token: node.client.getToken(),
      }).then((result) => result.client.getFirmwareVersion({
        sn: node.client.vehicleSN,
      })).then((result) => cloudLog(result, name))
        .then((result) => {
          const firmwareData = result.result;
          msg.payload = firmwareData;
          send(msg);
          if (done) { done(); }
        })
        .catch((err) => {
          handleCloudRequestError(err, name);
        });
    }

    function getVehiclePos(msg, send, done) {
      const name = 'vehicle-pos';
      node.client.cloud.setSessionToken({
        token: node.client.getToken(),
      }).then((result) => result.client.getVehiclePos({
        sn: node.client.vehicleSN,
      })).then((result) => cloudLog(result, name))
        .then((result) => {
          const vehiclePos = result.result;
          msg.payload = vehiclePos;
          send(msg);
          if (done) { done(); }
        })
        .catch((err) => {
          handleCloudRequestError(err, name);
        });
    }

    function getUpdateInfo(msg, send, done) {
      const name = 'update-info';
      node.client.cloud.setSessionToken({
        token: node.client.getToken(),
      }).then((result) => result.client.getUpdateInfo({
        sn: node.client.vehicleSN,
      })).then((result) => cloudLog(result, name))
        .then((result) => {
          const updateInfo = result.result;
          msg.payload = updateInfo;
          send(msg);
          if (done) { done(); }
        })
        .catch((err) => {
          handleCloudRequestError(err, name);
        });
    }

    function getTracks(msg, send, done) {
      const name = 'tracks';
      node.client.cloud.setSessionToken({
        token: node.client.getToken(),
      }).then((result) => result.client.getTracks({
        sn: node.client.vehicleSN,
        index: 0,
        pageSize: 10,
      })).then((result) => cloudLog(result, name))
        .then((result) => {
          const tracks = result.result;
          msg.payload = tracks;
          send(msg);
          if (done) { done(); }
        })
        .catch((err) => {
          handleCloudRequestError(err, name);
        });
    }


    // Handle input event
    node.on('input', (msg, send, done) => {
      node.client.dbglog(`Action: ${config.action}`);
      switch (config.action) {
        case 'vehicles':
          getVehicles(msg, send, done);
          break;
        case 'motor-info':
          getMotorInfo(msg, send, done);
          break;
        case 'overall-tally':
          getOverallTally(msg, send, done);
          break;
        case 'battery-info':
          getBatteryInfo(msg, send, done);
          break;
        case 'battery-health':
          getBatteryHealth(msg, send, done);
          break;
        case 'fw-version':
          getFirmwareVersion(msg, send, done);
          break;
        case 'vehicle-pos':
          getVehiclePos(msg, send, done);
          break;
        case 'update-info':
          getUpdateInfo(msg, send, done);
          break;
        case 'tracks':
          getTracks(msg, send, done);
          break;
        default:
          break;
      }
    });

    node.on('close', (removed, done) => {
      if (removed) {
        // This node has been disabled/deleted
      } else {
        node.status({
          fill: 'grey',
          shape: 'ring',
          text: 'Unknown',
        });
      }
      done();
    });
  }
  RED.nodes.registerType('niu-cloud', NiuCloudNode);
};
