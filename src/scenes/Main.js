'use strict';

import React, { PureComponent } from 'react';
import { StyleSheet, View, Alert, Dimensions, Platform, PermissionsAndroid, NetInfo } from 'react-native';

import {
  Container,
  Header,
  Title,
  Content,
  Footer,
  FooterTab,
  Button,
  Icon
} from 'native-base';
import MapView from 'react-native-maps';
import BackgroundGeolocation from 'react-native-mauron85-background-geolocation';
import TrackingDot from '../res/TrackingDot.png';
import { productApi } from '../api/api';
import { guid } from '../helper/untils';
import moment from 'moment';
import OfflineNotice from '../Components/OfflineNotice';

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  footer: {
    backgroundColor: '#0C68FB',
  },
  icon: {
    color: '#fff',
    fontSize: 30
  }
});
const latitudeDelta = 0.01;
const longitudeDelta = 0.01;
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

class MainScene extends PureComponent {
  static navigationOptions = {
    header: null
  }

  constructor(props) {
    super(props);
    this.state = {
      region: null,
      locations: [],
      stationaries: [],
      isRunning: false,
      error: null, 
      trackingId: null,
      deviceId: null,
      isConnected: true
    };

    this.goToSettings = this.goToSettings.bind(this);
  }
  
  handleConnectivityChange = (isConnected) => {
     console.log("handleConnectivityChange", isConnected);
    this.setState({ isConnected });
  };

  async requestCameraPermission() {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          'title': 'Location Permission',
          'message': 'Tuan Tra App needs access to your location '
        }
      )
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        this.callGetCurrentLocation();

      } else {
        console.log("location permission denied")
      }
    } catch (err) {
      console.warn(err)
    }
  }

  getCurrentLocation = () => {

    if(Platform.OS  === "ios"){
      this.callGetCurrentLocation();
      console.log('aaadios');
    }else {
      this.requestCameraPermission();
    }
  }

  callGetCurrentLocation = () => {
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        let region = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          latitudeDelta: latitudeDelta,
          longitudeDelta: longitudeDelta,
        }
        this.setState({
          region,
          error: null,
        });
      },
      (error) => this.setState({ error: error.message }),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000, distanceFilter: 10 },
    );
  }

  componentDidMount() {
    // kiem tra trong local da co chua -> neu chua co thi sinh cai deviceID 
    // neu co device Id thi dung
    // goi lay deviceID
    // Search cach lay EMEI chi doi voi android -> neu ko lay dc thi phai tu sinh  guid() luu vao local

    NetInfo.isConnected.addEventListener('connectionChange', this.handleConnectivityChange);
    this.toggleTracking();
    console.log('map did mount');
    if(this.trackingId === null){
      this.setState({ trackingId: guid()});
    }

    function logError(msg) {
      console.log(`[ERROR] logError: ${msg}`);
    }
    
    this.getCurrentLocation();
    
    const handleHistoricLocations = locations => {
      let region = null;
      const now = Date.now();
      const durationOfDayInMillis = 24 * 3600 * 1000;

      const locationsPast24Hours = locations.filter(location => {
        return now - location.time <= durationOfDayInMillis;
      });

      if (locationsPast24Hours.length > 0) {
        // asume locations are already sorted
        const lastLocation =
          locationsPast24Hours[locationsPast24Hours.length - 1];
        region = Object.assign({}, lastLocation, {
          latitudeDelta,
          longitudeDelta
        });
      }
      this.setState({ locations: locationsPast24Hours, region });
    };

    BackgroundGeolocation.getValidLocations(
      handleHistoricLocations.bind(this),
      logError
    );

    BackgroundGeolocation.on('start', () => {
      // service started successfully
      // you should adjust your app UI for example change switch element to indicate
      // that service is running
      console.log('[DEBUG] BackgroundGeolocation has been started');
      this.setState({ isRunning: true });
    });

    BackgroundGeolocation.on('stop', () => {
      console.log('[DEBUG] BackgroundGeolocation has been stopped');
      this.setState({ isRunning: false });
    });

    BackgroundGeolocation.on('authorization', status => {
      console.log(
        '[INFO] BackgroundGeolocation authorization status: ' + status
      );
      if (status !== BackgroundGeolocation.AUTHORIZED) {
        // we need to set delay after permission prompt or otherwise alert will not be shown
        setTimeout(() =>
          Alert.alert(
            'App requires location tracking',
            'Would you like to open app settings?',
            [
              {
                text: 'Yes',
                onPress: () => BackgroundGeolocation.showAppSettings()
              },
              {
                text: 'No',
                onPress: () => console.log('No Pressed'),
                style: 'cancel'
              }
            ]
        ), 1000);
      }
    });

    BackgroundGeolocation.on('error', ({ message }) => {
      Alert.alert('BackgroundGeolocation error', message);
    });


    /// new location received 
    /// call API
    BackgroundGeolocation.on('location', location => {
      console.log('[DEBUG] BackgroundGeolocation xxxxxxxxxx', location);
      BackgroundGeolocation.startTask(taskKey => {
        requestAnimationFrame(() => {
          const longitudeDelta = 0.01;
          const latitudeDelta = 0.01;
          const region = Object.assign({}, location, {
            latitudeDelta,
            longitudeDelta
          });
          const locations = this.state.locations.slice(0);
          locations.push(location);
          this.setState({ locations, region });
          BackgroundGeolocation.endTask(taskKey);
        });
      });
      
// COLLECT DATA => CALL API
      const locationSubmit = {time:"2018-10-10 10:10:10", lat: location.latitude.toString(), lng: location.longitude.toString()}
      const arrLocationSubmit = [locationSubmit];
      const now = moment().format('YYYY-MM-DD');;
      console.log('nownow',now);
      const locationSubmitStr = JSON.stringify(arrLocationSubmit);
      const data = {
        device_id: "1234567",
        platform: Platform.OS === "ios" ? "iOS" : "Android",
        arrLocations: locationSubmitStr,
        patrol_date: now.toString()
      }
      productApi.realtimeLocation(data);
    });

    BackgroundGeolocation.on('stationary', (location) => {
      console.log('[DEBUG] BackgroundGeolocation stationary', location);
      BackgroundGeolocation.startTask(taskKey => {
        requestAnimationFrame(() => {
          const stationaries = this.state.stationaries.slice(0);
          if (location.radius) {
            const longitudeDelta = 0.01;
            const latitudeDelta = 0.01;
            const region = Object.assign({}, location, {
              latitudeDelta,
              longitudeDelta
            });
            const stationaries = this.state.stationaries.slice(0);
            stationaries.push(location);
            this.setState({ stationaries, region });
          }
          BackgroundGeolocation.endTask(taskKey);
        });
      });
    });

    BackgroundGeolocation.on('foreground', () => {
      console.log('[INFO] App is in foreground');
    });

    BackgroundGeolocation.on('background', () => {
      console.log('[INFO] App is in background');
    });

    BackgroundGeolocation.checkStatus(({ isRunning }) => {
      this.setState({ isRunning });
    });
  }

  componentWillUnmount() {
    BackgroundGeolocation.events.forEach(event =>
      BackgroundGeolocation.removeAllListeners(event)
    );
    NetInfo.isConnected.removeEventListener('connectionChange', this.handleConnectivityChange);
    navigator.geolocation.clearWatch(this.watchId);
  }

  goToSettings() {
    this.props.navigation.navigate('Menu');
  }

  toggleTracking() {
    BackgroundGeolocation.checkStatus(({ isRunning, locationServicesEnabled, authorization }) => {
      if (isRunning) {
        BackgroundGeolocation.stop();
        return false;
      }

      if (!locationServicesEnabled) {
        Alert.alert(
          'Location services disabled',
          'Would you like to open location settings?',
          [
            {
              text: 'Yes',
              onPress: () => BackgroundGeolocation.showLocationSettings()
            },
            {
              text: 'No',
              onPress: () => console.log('No Pressed'),
              style: 'cancel'
            }
          ]
        );
        return false;
      }

      if (authorization == 99) {
        // authorization yet to be determined
        BackgroundGeolocation.start();
      } else if (authorization == BackgroundGeolocation.AUTHORIZED) {
        // calling start will also ask user for permission if needed
        // permission error will be handled in permisision_denied event
        BackgroundGeolocation.start();
      } else {
        Alert.alert(
          'App requires location tracking',
          'Please grant permission',
          [
            {
              text: 'Ok',
              onPress: () => BackgroundGeolocation.start()
            }
          ]
        );
      }
    });
  }

  renderOfflineNotice() {
    if (!this.state.isConnected) {
      return <OfflineNotice style={{position: 'absolute'}}/>;
    }
    return null;
  }

  render() {
    const { height, width } = Dimensions.get('window');
    const { locations, stationaries, region, isRunning } = this.state;
    console.log('render locations',locations);
    return (
      <Container>
        <Content>
          <MapView style={{ width, height }} region={region}>
            {locations.map((location, idx) => (
              <MapView.Marker
                key={idx}
                coordinate={location}
                image={TrackingDot}
              />
            ))}
            {stationaries.map((stationary, idx) => {
              return (
                <MapView.Circle
                  key={idx}
                  center={stationary}
                  radius={stationary.radius}
                  fillColor="#AAA"
                />
              );
            })}
          </MapView>
          {this.renderOfflineNotice()}
          {/* <Button onPress={this.toggleTracking} style={{position: 'absolute', marginTop: SCREEN_HEIGHT - 100, marginLeft: SCREEN_WIDTH - 50, width:50, height: 50 }}>
            <Icon name="menu" style={[styles.icon, ,{margin:0}]} />
          </Button> */}
        </Content>
        <Footer style={styles.footer}>
          <FooterTab>
            <Button >
              <Icon name={isRunning ? 'pause' : 'play'} style={styles.icon} />
            </Button>
            <Button onPress={this.goToSettings}>
              <Icon name="menu" style={styles.icon} />
            </Button>
          </FooterTab>
        </Footer>
      </Container>
    );
  }
}

export default MainScene;
