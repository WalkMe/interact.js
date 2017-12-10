const utils = require('./index');

const finder = {
  methodOrder: [ 'simulationResume', 'mouseOrPen', 'hasPointer', 'idle' ],

  search: function (details) {
    for (const method of finder.methodOrder) {
      const interaction = finder[method](details);

      if (interaction) {
        return interaction;
      }
    }
  },

  // try to resume simulation with a new pointer
  simulationResume: function ({ pointerType, eventType, eventTarget, scope }) {
    if (!/down|start/i.test(eventType)) {
      return null;
    }

    for (const interaction of scope.interactions) {
      let element = eventTarget;

      if (interaction.simulation && interaction.simulation.allowResume
          && (interaction.pointerType === pointerType)) {
        while (element) {
          // if the element is the interaction element
          if (element === interaction.element) {
            return interaction;
          }
          element = utils.dom.parentNode(element);
        }
      }
    }

    return null;
  },

  // if it's a mouse or pen interaction
  mouseOrPen: function ({ pointerId, pointerType, eventType, scope }) {
    if (pointerType !== 'mouse' && pointerType !== 'pen') {
      return null;
    }

    let firstNonActive;

    for (const interaction of scope.interactions) {
      if (interaction.pointerType === pointerType) {
        // if it's a down event, skip interactions with running simulations
        if (interaction.simulation && !utils.arr.contains(interaction.pointerIds, pointerId)) { continue; }

        // if the interaction is active, return it immediately
        if (interaction.interacting()) {
          return interaction;
        }
        // otherwise save it and look for another active interaction
        else if (!firstNonActive) {
          firstNonActive = interaction;
        }
      }
    }

    // if no active mouse interaction was found use the first inactive mouse
    // interaction
    if (firstNonActive) {
      return firstNonActive;
    }

    // find any mouse or pen interaction.
    // ignore the interaction if the eventType is a *down, and a simulation
    // is active
    for (const interaction of scope.interactions) {
      if (interaction.pointerType === pointerType && !(/down/i.test(eventType) && interaction.simulation)) {
        return interaction;
      }
    }

    return null;
  },

  // get interaction that has this pointer
  hasPointer: function ({ pointerId, scope }) {
    for (const interaction of scope.interactions) {
      if (utils.arr.contains(interaction.pointerIds, pointerId)) {
        return interaction;
      }
    }
  },

  // get first idle interaction with a matching pointerType
  idle: function ({ pointerType, scope }) {
    for (const interaction of scope.interactions) {
      // if there's already a pointer held down
      if (interaction.pointerIds.length === 1) {
        const target = interaction.target;
        // don't add this pointer if there is a target interactable and it
        // isn't gesturable
        if (target && !target.options.gesture.enabled) {
          continue;
        }
      }
      // maximum of 2 pointers per interaction
      else if (interaction.pointerIds.length >= 2) {
        continue;
      }

      if (!interaction.interacting() && (pointerType === interaction.pointerType)) {
        return interaction;
      }
    }

    return null;
  },
};

module.exports = finder;
