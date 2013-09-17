requireApp('clock/js/emitter.js');
requireApp('clock/js/utils.js');

requireApp('clock/test/unit/mocks/mock_asyncstorage.js');
requireApp('clock/js/timer.js');
requireApp('clock/js/timer_panel.js');

suite('Timer', function() {
  var as, al, now, startAt, endAt, duration;

  suiteSetup(function() {
    loadBodyHTML('/index.html');

    as = asyncStorage;

    asyncStorage = MockAsyncStorage;
  });

  suiteTeardown(function() {
    asyncStorage = as;
  });

  setup(function() {
    this.sinon.spy(asyncStorage, 'setItem');
    this.sinon.spy(asyncStorage, 'removeItem');

    now = Date.now();
    duration = 5000;
    startAt = now;
    endAt = now + duration;
  });

  test('shape:prototype ', function() {
    assert.ok(Timer);
    assert.ok(Timer.prototype.start);
    assert.ok(Timer.prototype.pause);
    assert.ok(Timer.prototype.cancel);
    assert.ok(Timer.prototype.tick);
    assert.ok(Timer.prototype.notify);
  });

  test('shape:static ', function() {
    assert.equal(Timer.INITIALIZED, 0);
    assert.equal(Timer.STARTED, 1);
    assert.equal(Timer.PAUSED, 2);
    assert.equal(Timer.CANCELED, 3);
    assert.equal(Timer.REACTIVATING, 4);
  });

  test('shape:instance ', function() {
    var timer = new Timer({
      startAt: startAt,
      endAt: endAt
    });

    assert.equal(timer.startAt, startAt);
    assert.equal(timer.endAt, endAt);
    assert.equal(timer.pauseAt, 0);
    assert.equal(timer.duration, duration);
    assert.equal(timer.lapsed, 0);
    assert.equal(timer.state, Timer.INITIALIZED);
    assert.equal(timer.sound, null);
  });

  test('start new timer ', function() {
    var stored;
    var timer = new Timer({
      startAt: now,
      endAt: now + duration
    });

    this.sinon.spy(timer, 'tick');

    timer.start();

    assert.isTrue(timer.tick.called);
    assert.isTrue(asyncStorage.setItem.called);
    assert.equal(asyncStorage.setItem.args[0][0], 'active_timer');

    stored = JSON.parse(asyncStorage.setItem.args[0][1]);

    // The startAt and endAt time will have been
    // adjusted to ensure that they are correct when
    // the timer starts for the first time.
    // All we care about is that they are not zero
    assert.ok(stored.startAt);
    assert.ok(stored.endAt);

    assert.equal(stored.endAt - stored.startAt, duration);
    assert.equal(stored.duration, duration);

    assert.equal(stored.pauseAt, 0);
    assert.equal(stored.state, 1);
  });

  test('reactivate an un-paused timer ', function() {
    var stored;
    var timer = new Timer({
      startAt: startAt,
      endAt: endAt,
      pauseAt: 0,
      duration: duration,
      state: Timer.STARTED
    });
    this.sinon.spy(timer, 'tick');

    // Reactivating a timer that was in STARTED state
    // will be put the timer into REACTIVATING state until
    // its start method is called.
    assert.equal(timer.state, Timer.REACTIVATING);

    timer.start();

    assert.isTrue(timer.tick.called);
    assert.isTrue(asyncStorage.setItem.called);
    assert.equal(asyncStorage.setItem.args[0][0], 'active_timer');

    stored = JSON.parse(asyncStorage.setItem.args[0][1]);

    // The startAt and endAt time will have been
    // adjusted to ensure that they are correct when
    // the timer starts for the first time.
    // All we care about is that they are not zero
    assert.ok(stored.startAt);
    assert.ok(stored.endAt);

    assert.equal(stored.endAt - stored.startAt, duration);
    assert.equal(stored.duration, duration);

    assert.equal(stored.pauseAt, 0);
    assert.equal(stored.state, 1);
  });

  test('reactivate a paused timer ', function() {
    var stored;
    var timer = new Timer({
      startAt: startAt,
      endAt: endAt,
      pauseAt: endAt - 3000,
      duration: duration,
      state: Timer.PAUSED
    });

    this.sinon.spy(timer, 'tick');

    timer.start();

    assert.isTrue(timer.tick.called);
    assert.isTrue(asyncStorage.setItem.called);
    assert.equal(asyncStorage.setItem.args[1][0], 'active_timer');

    stored = JSON.parse(asyncStorage.setItem.args[1][1]);

    // The startAt and endAt time will have been
    // adjusted to ensure that they are correct when
    // the timer starts for the first time.
    // All we care about is that they are not zero
    assert.ok(stored.startAt);
    assert.ok(stored.endAt);

    // pause will have been reset to 0
    assert.equal(stored.pauseAt, 0);
    assert.equal(stored.duration, duration);
    assert.equal(stored.state, 1);
  });

  test('tick ', function(done) {
    this.timeout(5000);
    var isCalled = false;
    var timer = new Timer({
      startAt: startAt,
      endAt: endAt
    });

    timer.on('tick', function(remaining) {
      // wait for lapsed to be updated at least 1 second
      if (timer.lapsed > 1 && !isCalled) {
        isCalled = true;
        assert.ok(remaining);
        assert.isTrue(asyncStorage.setItem.called);
        done();
      }
    });

    timer.start();
  });

  test('tick to end ', function(done) {
    this.timeout(3000);
    now = Date.now();
    var timer = new Timer({
      startAt: now,
      endAt: now + 1000
    });

    this.sinon.spy(timer, 'cancel');
    this.sinon.spy(timer, 'notify');

    timer.on('end', function() {
      assert.isTrue(timer.cancel.called);
      assert.isTrue(timer.notify.called);
      assert.isTrue(asyncStorage.removeItem.called);
      done();
    });

    timer.start();
  });

  test('pause ', function() {
    var timer = new Timer({
      startAt: startAt,
      endAt: endAt
    });
    timer.start();

    timer.pause();

    assert.ok(timer.pauseAt);
    assert.equal(timer.state, Timer.PAUSED);
    assert.isTrue(asyncStorage.setItem.called);
  });

  test('cancel ', function() {
    var timer = new Timer({
      startAt: startAt,
      endAt: endAt
    });
    timer.start();

    timer.cancel();

    assert.equal(timer.state, Timer.CANCELED);
    assert.isTrue(asyncStorage.removeItem.called);
  });

  test('notify ', function() {
    var timer = new Timer({
      startAt: startAt,
      endAt: endAt
    });

    this.sinon.spy(navigator, 'vibrate');

    timer.notify();

    assert.isTrue(navigator.vibrate.called);

    // TODO: Add sound playback notification tests
  });

});