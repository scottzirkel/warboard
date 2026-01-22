import Alpine from 'alpinejs'
import collapse from '@alpinejs/collapse'
import './style.css'

Alpine.plugin(collapse)
window.Alpine = Alpine

Alpine.data('armyTracker', () => ({
  mode: 'build',
  selectedArmy: 'custodes',
  availableArmies: [
    { id: 'custodes', name: 'Adeptus Custodes', file: 'custodes.json' },
    { id: 'tyranids', name: 'Tyranids', file: 'tyranids.json', disabled: true }
  ],
  data: {
    units: [],
    detachments: {},
    armyRules: {}
  },
  currentList: {
    name: 'New Army List',
    army: 'custodes',
    detachment: 'shield_host',
    gameFormat: 'standard',
    pointsLimit: 2000,
    units: [],
    activeKatah: '',
    activeModifiers: []
  },
  gameFormats: {
    standard: { name: 'Standard', pointsOptions: [500, 1000, 2000] },
    colosseum: { name: 'Colosseum', pointsOptions: [500] }
  },
  gameState: {
    battleRound: 1,
    commandPoints: 0,
    activeStratagems: []
  },
  selectedUnit: null,
  selectedPlayUnitIndex: null,
  searchQuery: '',
  savedLists: [],
  expandedGroups: {
    characters: true,
    battleline: true,
    infantry: false,
    mounted: false,
    vehicles: false,
    allies: false
  },
  showImportModal: false,
  showLoadModal: false,
  showReferencePanel: false,
  importData: '',
  toast: {
    show: false,
    message: '',
    type: 'success'
  },

  async init() {
    await this.loadData()
    await this.fetchSavedLists()
  },

  async loadData() {
    const army = this.availableArmies.find(a => a.id === this.selectedArmy)
    if (!army) return

    try {
      const response = await fetch(`/data/${army.file}`)
      this.data = await response.json()

      if (this.currentList.army !== this.selectedArmy) {
        this.currentList.army = this.selectedArmy
        this.currentList.detachment = Object.keys(this.data.detachments || {})[0] || ''
        this.currentList.units = []
        this.selectedUnit = null
      }
    } catch (error) {
      console.error('Failed to load unit data:', error)
      this.showToast('Failed to load unit data', 'error')
    }
  },

  async changeArmy(armyId) {
    const army = this.availableArmies.find(a => a.id === armyId)
    if (!army || army.disabled) return

    this.selectedArmy = armyId
    await this.loadData()
    this.showToast(`Switched to ${army.name}`, 'success')
  },

  get allUnits() {
    const custodes = (this.data.units || []).map(u => ({ ...u, isAlly: false }))
    const allies = []
    for (const faction of Object.values(this.data.allies || {})) {
      for (const unit of faction.units || []) {
        allies.push({ ...unit, isAlly: true, allyFaction: faction.name })
      }
    }
    return [...custodes, ...allies]
  },

  get filteredUnits() {
    if (!this.searchQuery) {
      return this.allUnits
    }
    const query = this.searchQuery.toLowerCase()
    return this.allUnits.filter(unit =>
      unit.name.toLowerCase().includes(query) ||
      unit.keywords.some(k => k.toLowerCase().includes(query))
    )
  },

  get groupedUnits() {
    const units = this.filteredUnits
    const groups = {
      characters: { label: 'Characters', units: [] },
      battleline: { label: 'Battleline', units: [] },
      infantry: { label: 'Other Infantry', units: [] },
      mounted: { label: 'Mounted', units: [] },
      vehicles: { label: 'Vehicles', units: [] },
      allies: { label: 'Allies', units: [] }
    }

    for (const unit of units) {
      if (unit.isAlly) {
        groups.allies.units.push(unit)
        continue
      }
      const keywords = unit.keywords || []
      if (keywords.includes('Character')) {
        groups.characters.units.push(unit)
      } else if (keywords.includes('Battleline')) {
        groups.battleline.units.push(unit)
      } else if (keywords.includes('Vehicle')) {
        groups.vehicles.units.push(unit)
      } else if (keywords.includes('Mounted')) {
        groups.mounted.units.push(unit)
      } else {
        groups.infantry.units.push(unit)
      }
    }

    return groups
  },

  toggleGroup(group) {
    this.expandedGroups[group] = !this.expandedGroups[group]
  },

  get totalPoints() {
    return this.currentList.units.reduce((total, listUnit) => {
      return total + this.getUnitPoints(listUnit)
    }, 0)
  },

  get pointsRemaining() {
    return this.currentList.pointsLimit - this.totalPoints
  },

  get pointsStatus() {
    const over = this.totalPoints - this.currentList.pointsLimit
    if (over > 10) return 'error'
    if (over > 0) return 'warning'
    return 'ok'
  },

  get colosseumErrors() {
    if (this.currentList.gameFormat !== 'colosseum') return []

    const errors = []
    const units = this.currentList.units.map(lu => ({
      ...lu,
      unit: this.getUnitById(lu.unitId)
    })).filter(lu => lu.unit)

    // Must include at least one character (non-epic hero) as Warlord
    const characters = units.filter(lu =>
      lu.unit.keywords?.includes('Character') &&
      !lu.unit.keywords?.includes('Epic Hero')
    )
    if (characters.length === 0) {
      errors.push('Must include at least one Character (non-Epic Hero) as Warlord')
    }

    // No epic heroes
    const epicHeroes = units.filter(lu => lu.unit.keywords?.includes('Epic Hero'))
    if (epicHeroes.length > 0) {
      errors.push('Epic Heroes are not allowed')
    }

    // Must include 2 infantry non-character units
    const infantryNonChar = units.filter(lu =>
      lu.unit.keywords?.includes('Infantry') &&
      !lu.unit.keywords?.includes('Character')
    )
    if (infantryNonChar.length < 2) {
      errors.push(`Need ${2 - infantryNonChar.length} more Infantry (non-Character) unit${infantryNonChar.length === 1 ? '' : 's'}`)
    }

    // No units T10+
    const tooTough = units.filter(lu => lu.unit.stats?.t >= 10)
    if (tooTough.length > 0) {
      const names = tooTough.map(lu => lu.unit.name).join(', ')
      errors.push(`Units with T10+ not allowed: ${names}`)
    }

    return errors
  },

  get maxModelsErrors() {
    const errors = []

    this.currentList.units.forEach((listUnit, unitIndex) => {
      const unit = this.getUnitById(listUnit.unitId)
      if (!unit) return

      const weaponCounts = listUnit.weaponCounts || {}

      for (const option of unit.loadoutOptions || []) {
        for (const choice of option.choices) {
          if (choice.id === 'none') continue
          if (choice.maxModels === undefined) continue

          const count = weaponCounts[choice.id] || 0
          if (count > choice.maxModels) {
            errors.push(`${unit.name}: ${choice.name} limited to ${choice.maxModels} model(s), but ${count} assigned`)
          }
        }
      }
    })

    return errors
  },

  get leaderAttachmentErrors() {
    const errors = []
    const units = this.currentList.units

    // Track which leaders are attached and to which units
    const leaderAttachments = new Map() // leaderIndex -> array of unitIndices

    units.forEach((listUnit, unitIndex) => {
      if (listUnit.attachedLeader?.unitIndex !== undefined) {
        const leaderIndex = listUnit.attachedLeader.unitIndex

        if (!leaderAttachments.has(leaderIndex)) {
          leaderAttachments.set(leaderIndex, [])
        }
        leaderAttachments.get(leaderIndex).push(unitIndex)
      }
    })

    // Check for leaders attached to multiple units
    leaderAttachments.forEach((attachedToUnits, leaderIndex) => {
      if (attachedToUnits.length > 1) {
        const leaderListUnit = units[leaderIndex]
        const leaderUnit = leaderListUnit ? this.getUnitById(leaderListUnit.unitId) : null
        const leaderName = leaderUnit?.name || 'Leader'
        const unitNames = attachedToUnits.map(i => {
          const u = this.getUnitById(units[i]?.unitId)
          return u?.name || 'unit'
        }).join(', ')
        errors.push(`${leaderName} is attached to multiple units: ${unitNames}`)
      }
    })

    // Check for units with multiple leaders
    units.forEach((listUnit, unitIndex) => {
      if (!listUnit.attachedLeader) return

      const unit = this.getUnitById(listUnit.unitId)
      const unitName = unit?.name || 'Unit'

      // Count how many leaders are attached to this unit
      const attachedLeaders = units.filter((_, i) =>
        units.some(u => u.attachedLeader?.unitIndex === i &&
          units.indexOf(u) === unitIndex)
      )

      // Verify the attached leader exists
      const leaderIndex = listUnit.attachedLeader.unitIndex
      if (leaderIndex >= units.length || leaderIndex < 0) {
        errors.push(`${unitName} has an invalid leader attachment`)
        return
      }

      const leaderListUnit = units[leaderIndex]
      if (!leaderListUnit) {
        errors.push(`${unitName} has an invalid leader attachment`)
        return
      }

      // Verify the leader has the Leader ability for this unit
      const leaderUnit = this.getUnitById(leaderListUnit.unitId)
      const leaderAbility = leaderUnit?.abilities?.find(a => a.id === 'leader')

      if (!leaderAbility) {
        errors.push(`${leaderUnit?.name || 'Unit'} cannot be a leader (no Leader ability)`)
        return
      }

      if (!leaderAbility.eligibleUnits?.includes(listUnit.unitId)) {
        errors.push(`${leaderUnit?.name || 'Leader'} cannot attach to ${unitName}`)
      }
    })

    return errors
  },

  get listErrors() {
    return [...this.colosseumErrors, ...this.maxModelsErrors, ...this.leaderAttachmentErrors]
  },

  get canPlay() {
    return this.pointsStatus !== 'error' &&
           this.currentList.units.length > 0 &&
           this.listErrors.length === 0
  },

  setGameFormat(format) {
    this.currentList.gameFormat = format
    const options = this.gameFormats[format].pointsOptions
    if (!options.includes(this.currentList.pointsLimit)) {
      this.currentList.pointsLimit = options[0]
    }
  },

  formatInches(value) {
    return value + '"'
  },

  sortedWeapons(weapons) {
    if (!weapons) return []
    const typeOrder = { ranged: 0, melee: 1, equipment: 2 }
    return [...weapons].sort((a, b) => (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99))
  },

  selectUnit(unit) {
    this.selectedUnit = unit
  },

  selectPlayUnit(index) {
    this.selectedPlayUnitIndex = index
  },

  getUnitById(unitId) {
    const custodes = this.data.units?.find(u => u.id === unitId)
    if (custodes) return custodes

    for (const faction of Object.values(this.data.allies || {})) {
      const ally = faction.units?.find(u => u.id === unitId)
      if (ally) return { ...ally, isAlly: true, allyFaction: faction.name }
    }
    return null
  },

  getPointsDisplay(unit) {
    const points = Object.values(unit.points)
    if (points.length === 1) {
      return points[0] + ' pts'
    }
    return `${Math.min(...points)}-${Math.max(...points)} pts`
  },

  getModelCounts(unitId) {
    const unit = this.getUnitById(unitId)
    if (!unit) return []
    return Object.keys(unit.points).map(k => parseInt(k))
  },

  getUnitPoints(listUnit) {
    const unit = this.getUnitById(listUnit.unitId)
    if (!unit) return 0

    let points = unit.points[listUnit.modelCount] || 0

    if (listUnit.enhancement) {
      const enhancement = this.getEnhancementById(listUnit.enhancement)
      if (enhancement) {
        points += enhancement.points
      }
    }

    return points
  },

  addUnitToList(unit) {
    const modelCounts = Object.keys(unit.points).map(k => parseInt(k))
    const initialModelCount = modelCounts[0]
    this.currentList.units.push({
      unitId: unit.id,
      modelCount: initialModelCount,
      enhancement: '',
      weaponCounts: this.getDefaultWeaponCounts(unit, initialModelCount),
      currentWounds: null,
      attachedLeader: null
    })
    this.showToast(`${unit.name} added to list`, 'success')
  },

  getDefaultWeaponCounts(unit, modelCount) {
    const counts = {}
    const options = unit.loadoutOptions || []

    if (options.length === 0) return counts

    for (const option of options) {
      for (const choice of option.choices) {
        if (choice.id !== 'none') {
          counts[choice.id] = 0
        }
      }
    }

    // Set default weapon to full model count
    const mainOption = options.find(o => o.type === 'choice') || options[0]
    if (mainOption) {
      const defaultChoice = mainOption.choices.find(c => c.default) || mainOption.choices[0]
      if (defaultChoice && defaultChoice.id !== 'none') {
        counts[defaultChoice.id] = modelCount
      }
    }

    return counts
  },

  getWeaponChoices(unitId) {
    const unit = this.getUnitById(unitId)
    if (!unit) return []

    const choices = []
    for (const option of unit.loadoutOptions || []) {
      for (const choice of option.choices) {
        if (choice.id !== 'none') {
          choices.push({
            id: choice.id,
            name: choice.name,
            optionId: option.id,
            optionType: option.type,
            optionPattern: option.pattern || 'replacement',
            maxModels: choice.maxModels
          })
        }
      }
    }
    return choices
  },

  getLoadoutOptionsByPattern(unitId) {
    const unit = this.getUnitById(unitId)
    if (!unit) return { replacement: [], addition: [] }

    const result = { replacement: [], addition: [] }

    for (const option of unit.loadoutOptions || []) {
      const pattern = option.pattern || 'replacement'
      const optionWithChoices = {
        id: option.id,
        name: option.name,
        type: option.type,
        pattern: pattern,
        choices: option.choices.filter(c => c.id !== 'none').map(c => ({
          id: c.id,
          name: c.name,
          maxModels: c.maxModels,
          default: c.default,
          paired: c.paired
        }))
      }

      if (optionWithChoices.choices.length > 0) {
        result[pattern].push(optionWithChoices)
      }
    }

    return result
  },

  getChoiceMaxModels(unitId, choiceId) {
    const unit = this.getUnitById(unitId)
    if (!unit) return null

    for (const option of unit.loadoutOptions || []) {
      for (const choice of option.choices) {
        if (choice.id === choiceId) {
          return choice.maxModels ?? null
        }
      }
    }
    return null
  },

  getLoadoutOptionForChoice(unitId, choiceId) {
    const unit = this.getUnitById(unitId)
    if (!unit) return null

    for (const option of unit.loadoutOptions || []) {
      for (const choice of option.choices) {
        if (choice.id === choiceId) {
          return option
        }
      }
    }
    return null
  },

  isPairedChoice(unitId, choiceId) {
    const unit = this.getUnitById(unitId)
    if (!unit) return false

    for (const option of unit.loadoutOptions || []) {
      for (const choice of option.choices) {
        if (choice.id === choiceId) {
          return choice.paired === true
        }
      }
    }
    return false
  },

  getPairedChoiceName(unitId, choiceId) {
    const unit = this.getUnitById(unitId)
    if (!unit) return null

    for (const option of unit.loadoutOptions || []) {
      for (const choice of option.choices) {
        if (choice.id === choiceId && choice.paired) {
          return choice.name
        }
      }
    }
    return null
  },

  isWeaponEquipped(listUnit, weapon) {
    if (!weapon.loadoutGroup) {
      return true
    }

    const weaponCounts = listUnit.weaponCounts || {}
    const count = weaponCounts[weapon.loadoutGroup] || 0

    if (count > 0) {
      return true
    }

    // Support legacy loadout format
    if (Object.keys(weaponCounts).length === 0 && listUnit.loadout) {
      const loadoutValues = Object.values(listUnit.loadout).filter(v => v && v !== 'none')
      return loadoutValues.includes(weapon.loadoutGroup)
    }

    return false
  },

  getWeaponCountTotal(listUnit) {
    if (!listUnit.weaponCounts) return 0
    return Object.values(listUnit.weaponCounts).reduce((sum, count) => sum + count, 0)
  },

  getWeaponCountError(listUnit) {
    const total = this.getWeaponCountTotal(listUnit)
    if (total < listUnit.modelCount) {
      return `${listUnit.modelCount - total} model(s) need weapons`
    }
    if (total > listUnit.modelCount) {
      return `${total - listUnit.modelCount} too many weapons assigned`
    }
    return null
  },

  updateWeaponCount(unitIndex, choiceId, delta) {
    const listUnit = this.currentList.units[unitIndex]
    if (!listUnit || !listUnit.weaponCounts) return

    const current = listUnit.weaponCounts[choiceId] || 0
    const maxModels = this.getChoiceMaxModels(listUnit.unitId, choiceId)
    const upperLimit = maxModels !== null ? Math.min(maxModels, listUnit.modelCount) : listUnit.modelCount
    const newCount = Math.max(0, Math.min(upperLimit, current + delta))
    listUnit.weaponCounts[choiceId] = newCount

    // For single-model units, enforce mutual exclusivity
    if (listUnit.modelCount === 1 && newCount === 1) {
      for (const key of Object.keys(listUnit.weaponCounts)) {
        if (key !== choiceId) {
          listUnit.weaponCounts[key] = 0
        }
      }
    }
  },

  setWeaponCount(unitIndex, choiceId, value) {
    const listUnit = this.currentList.units[unitIndex]
    if (!listUnit || !listUnit.weaponCounts) return

    const numValue = parseInt(value) || 0
    const maxModels = this.getChoiceMaxModels(listUnit.unitId, choiceId)
    const upperLimit = maxModels !== null ? Math.min(maxModels, listUnit.modelCount) : listUnit.modelCount
    listUnit.weaponCounts[choiceId] = Math.max(0, Math.min(upperLimit, numValue))

    // For single-model units, enforce mutual exclusivity
    if (listUnit.modelCount === 1 && numValue === 1) {
      for (const key of Object.keys(listUnit.weaponCounts)) {
        if (key !== choiceId) {
          listUnit.weaponCounts[key] = 0
        }
      }
    }
  },

  onModelCountChange(unitIndex, newCount) {
    const listUnit = this.currentList.units[unitIndex]
    if (!listUnit) return

    const unit = this.getUnitById(listUnit.unitId)
    if (!unit) return

    newCount = parseInt(newCount)
    const oldCount = listUnit.modelCount

    // If no weapon counts yet, initialize them
    if (!listUnit.weaponCounts || Object.keys(listUnit.weaponCounts).length === 0) {
      listUnit.weaponCounts = this.getDefaultWeaponCounts(unit, newCount)
      return
    }

    // Adjust weapon counts proportionally or cap at new count
    const total = this.getWeaponCountTotal(listUnit)

    if (newCount < oldCount) {
      // Reducing models - cap each weapon count and adjust to fit
      let excess = total - newCount
      for (const [choiceId, count] of Object.entries(listUnit.weaponCounts)) {
        if (excess > 0 && count > 0) {
          const reduction = Math.min(count, excess)
          listUnit.weaponCounts[choiceId] = count - reduction
          excess -= reduction
        }
      }
    } else if (newCount > oldCount) {
      // Adding models - add to the default weapon
      const options = unit.loadoutOptions || []
      const mainOption = options.find(o => o.type === 'choice') || options[0]
      if (mainOption) {
        const defaultChoice = mainOption.choices.find(c => c.default) || mainOption.choices[0]
        if (defaultChoice && defaultChoice.id !== 'none') {
          const diff = newCount - total
          listUnit.weaponCounts[defaultChoice.id] = (listUnit.weaponCounts[defaultChoice.id] || 0) + diff
        }
      }
    }
  },

  getEquippedWeapons(listUnit) {
    const unit = this.getUnitById(listUnit.unitId)
    if (!unit) return []

    const weaponCounts = listUnit.weaponCounts || {}
    const equippedChoices = Object.entries(weaponCounts)
      .filter(([_, count]) => count > 0)
      .map(([id]) => id)

    // Build sets of equipped groups by pattern type
    const replacementGroups = new Set()
    const additionGroups = new Set()

    for (const choiceId of equippedChoices) {
      const option = this.getLoadoutOptionForChoice(listUnit.unitId, choiceId)
      if (option?.pattern === 'addition') {
        additionGroups.add(choiceId)
      } else {
        replacementGroups.add(choiceId)
      }
    }

    // Also support legacy loadout format
    if (Object.keys(weaponCounts).length === 0 && listUnit.loadout) {
      const loadout = listUnit.loadout
      Object.values(loadout).filter(v => v && v !== 'none').forEach(v => replacementGroups.add(v))
    }

    const allEquippedGroups = new Set([...replacementGroups, ...additionGroups])

    return this.sortedWeapons(unit.weapons).filter(w => {
      if (w.type === 'equipment') return false
      if (!w.loadoutGroup) return true
      return allEquippedGroups.has(w.loadoutGroup)
    })
  },

  getEquippedWeaponsWithCounts(listUnit) {
    const unit = this.getUnitById(listUnit.unitId)
    if (!unit) return []

    const weaponCounts = listUnit.weaponCounts || {}
    const results = []

    // Build map of loadoutGroup to pattern type and paired status
    const groupPatterns = {}
    const groupPaired = {}
    for (const option of unit.loadoutOptions || []) {
      for (const choice of option.choices) {
        if (choice.id !== 'none') {
          groupPatterns[choice.id] = option.pattern || 'replacement'
          groupPaired[choice.id] = choice.paired || false
        }
      }
    }

    // Group weapons by loadoutGroup
    const groupedWeapons = {}
    for (const weapon of unit.weapons) {
      if (weapon.type === 'equipment') continue
      const group = weapon.loadoutGroup || '_default'
      if (!groupedWeapons[group]) {
        groupedWeapons[group] = []
      }
      groupedWeapons[group].push(weapon)
    }

    // Add weapons with their counts based on pattern
    for (const [group, weapons] of Object.entries(groupedWeapons)) {
      let count = 0
      const isPaired = groupPaired[group] || false

      if (group === '_default') {
        // Default weapons (no loadoutGroup) are used by all models
        count = listUnit.modelCount
      } else {
        const pattern = groupPatterns[group] || 'replacement'
        const equippedCount = weaponCounts[group] || 0

        if (pattern === 'addition') {
          // Addition pattern: weapon is used by the models that have it equipped
          count = equippedCount
        } else {
          // Replacement pattern: weapon is used by models with this choice selected
          count = equippedCount
        }
      }

      if (count > 0) {
        for (const weapon of weapons) {
          results.push({ ...weapon, modelCount: count, isPaired: isPaired })
        }
      }
    }

    return this.sortedWeapons(results)
  },

  getEquippedAbilities(listUnit) {
    const unit = this.getUnitById(listUnit.unitId)
    if (!unit) return unit?.abilities || []

    const weaponCounts = listUnit.weaponCounts || {}
    const equippedChoices = Object.entries(weaponCounts)
      .filter(([_, count]) => count > 0)
      .map(([id]) => id)

    // Build set of all equipped groups (both replacement and addition patterns)
    const equippedGroups = new Set()
    for (const choiceId of equippedChoices) {
      equippedGroups.add(choiceId)
    }

    // Also support legacy loadout format
    if (Object.keys(weaponCounts).length === 0 && listUnit.loadout) {
      const loadout = listUnit.loadout
      Object.values(loadout).filter(v => v && v !== 'none').forEach(v => equippedGroups.add(v))
    }

    return (unit.abilities || []).filter(a => {
      if (!a.loadoutGroup) return true
      return equippedGroups.has(a.loadoutGroup)
    })
  },

  removeUnitFromList(index) {
    this.currentList.units.splice(index, 1)
  },

  canHaveEnhancement(unitId) {
    const unit = this.getUnitById(unitId)
    return unit?.keywords?.includes('Character')
  },

  canHaveLeaderAttached(unitIndex) {
    const listUnit = this.currentList.units[unitIndex]
    if (!listUnit) return false

    const unit = this.getUnitById(listUnit.unitId)
    if (!unit) return false

    // Characters cannot have leaders attached to them
    if (unit.keywords?.includes('Character')) return false

    // Check if any leader in the list has this unit in their eligibleUnits
    return this.currentList.units.some((candidateListUnit, candidateIndex) => {
      if (candidateIndex === unitIndex) return false

      const candidateUnit = this.getUnitById(candidateListUnit.unitId)
      if (!candidateUnit) return false

      const leaderAbility = candidateUnit.abilities?.find(a => a.id === 'leader')
      return leaderAbility?.eligibleUnits?.includes(listUnit.unitId)
    })
  },

  getAttachedLeaderName(unitIndex) {
    const listUnit = this.currentList.units[unitIndex]
    if (!listUnit?.attachedLeader) return null

    const leaderListUnit = this.currentList.units[listUnit.attachedLeader.unitIndex]
    if (!leaderListUnit) return null

    const leaderUnit = this.getUnitById(leaderListUnit.unitId)
    return leaderUnit?.name || null
  },

  getCombinedUnitName(unitIndex) {
    const listUnit = this.currentList.units[unitIndex]
    if (!listUnit) return ''

    const unit = this.getUnitById(listUnit.unitId)
    if (!unit) return ''

    const leaderName = this.getAttachedLeaderName(unitIndex)
    if (leaderName) {
      return `${unit.name} + ${leaderName}`
    }

    return unit.name
  },

  getCombinedModelCount(unitIndex) {
    const listUnit = this.currentList.units[unitIndex]
    if (!listUnit) return 0

    let count = listUnit.modelCount

    // Add leader model count if attached
    if (listUnit.attachedLeader?.unitIndex !== undefined) {
      const leaderListUnit = this.currentList.units[listUnit.attachedLeader.unitIndex]
      if (leaderListUnit) {
        count += leaderListUnit.modelCount
      }
    }

    return count
  },

  getLeaderWeapons(unitIndex) {
    const listUnit = this.currentList.units[unitIndex]
    if (!listUnit?.attachedLeader) return []

    const leaderListUnit = this.currentList.units[listUnit.attachedLeader.unitIndex]
    if (!leaderListUnit) return []

    return this.getEquippedWeaponsWithCounts(leaderListUnit)
  },

  isUnitAttachedAsLeader(unitIndex) {
    // Check if this unit is attached as a leader to any other unit
    return this.currentList.units.some(u => u.attachedLeader?.unitIndex === unitIndex)
  },

  getAttachedToUnitName(unitIndex) {
    // Find which unit this leader is attached to and return its name
    const attachedToIndex = this.currentList.units.findIndex(u => u.attachedLeader?.unitIndex === unitIndex)
    if (attachedToIndex === -1) return null

    const attachedToListUnit = this.currentList.units[attachedToIndex]
    const attachedToUnit = this.getUnitById(attachedToListUnit?.unitId)
    return attachedToUnit?.name || null
  },

  getAvailableLeaders(unitIndex) {
    const listUnit = this.currentList.units[unitIndex]
    if (!listUnit) return []

    const targetUnit = this.getUnitById(listUnit.unitId)
    if (!targetUnit) return []

    const availableLeaders = []

    // Check each unit in the list to see if it's an eligible leader
    this.currentList.units.forEach((candidateListUnit, candidateIndex) => {
      // Skip the target unit itself
      if (candidateIndex === unitIndex) return

      // Skip units that are already attached to another unit
      const isAlreadyAttached = this.currentList.units.some((u, i) =>
        i !== unitIndex && u.attachedLeader?.unitIndex === candidateIndex
      )
      if (isAlreadyAttached) return

      const candidateUnit = this.getUnitById(candidateListUnit.unitId)
      if (!candidateUnit) return

      // Check if this unit has a Leader ability with eligibleUnits
      const leaderAbility = candidateUnit.abilities?.find(a => a.id === 'leader')
      if (!leaderAbility?.eligibleUnits) return

      // Check if the target unit is in the eligible units list
      if (leaderAbility.eligibleUnits.includes(listUnit.unitId)) {
        availableLeaders.push({
          unitIndex: candidateIndex,
          unitId: candidateListUnit.unitId,
          name: candidateUnit.name,
          enhancement: candidateListUnit.enhancement
        })
      }
    })

    return availableLeaders
  },

  attachLeader(unitIndex, leaderIndex) {
    const listUnit = this.currentList.units[unitIndex]
    if (!listUnit) return

    const leaderListUnit = this.currentList.units[leaderIndex]
    if (!leaderListUnit) return

    const targetUnit = this.getUnitById(listUnit.unitId)
    const leaderUnit = this.getUnitById(leaderListUnit.unitId)

    // Validate: leader must have Leader ability
    const leaderAbility = leaderUnit?.abilities?.find(a => a.id === 'leader')
    if (!leaderAbility) {
      this.showToast(`${leaderUnit?.name || 'Unit'} cannot be a leader`, 'error')
      return
    }

    // Validate: target unit must be in eligibleUnits
    if (!leaderAbility.eligibleUnits?.includes(listUnit.unitId)) {
      this.showToast(`${leaderUnit?.name || 'Leader'} cannot attach to ${targetUnit?.name || 'this unit'}`, 'error')
      return
    }

    // First, detach the leader from any unit it's currently attached to
    this.currentList.units.forEach((u, i) => {
      if (u.attachedLeader?.unitIndex === leaderIndex) {
        u.attachedLeader = null
      }
    })

    // Attach the leader to the target unit
    listUnit.attachedLeader = { unitIndex: leaderIndex }

    this.showToast(`${leaderUnit?.name || 'Leader'} attached to ${targetUnit?.name || 'unit'}`, 'success')
  },

  detachLeader(unitIndex) {
    const listUnit = this.currentList.units[unitIndex]
    if (!listUnit || !listUnit.attachedLeader) return

    const leaderListUnit = this.currentList.units[listUnit.attachedLeader.unitIndex]
    const leaderUnit = leaderListUnit ? this.getUnitById(leaderListUnit.unitId) : null

    listUnit.attachedLeader = null

    this.showToast(`${leaderUnit?.name || 'Leader'} detached`, 'success')
  },

  getAvailableEnhancements() {
    const detachment = this.getDetachment()
    return detachment?.enhancements || []
  },

  getEnhancementById(enhancementId) {
    for (const det of Object.values(this.data.detachments || {})) {
      const enh = det.enhancements?.find(e => e.id === enhancementId)
      if (enh) return enh
    }
    return null
  },

  getDetachment() {
    return this.data.detachments?.[this.currentList.detachment]
  },

  getKatahDescription(katahId) {
    const stance = this.data.armyRules?.martial_katah?.stances?.find(s => s.id === katahId)
    return stance?.description || ''
  },

  getKatahName(katahId) {
    const stance = this.data.armyRules?.martial_katah?.stances?.find(s => s.id === katahId)
    return stance?.name || ''
  },

  getStratagemById(stratId) {
    for (const det of Object.values(this.data.detachments || {})) {
      const strat = det.stratagems?.find(s => s.id === stratId)
      if (strat) return strat
    }
    return null
  },

  toggleStratagem(stratId) {
    const index = this.gameState.activeStratagems.indexOf(stratId)
    if (index === -1) {
      this.gameState.activeStratagems.push(stratId)
    } else {
      this.gameState.activeStratagems.splice(index, 1)
    }
  },

  getMaxWounds(unitIndex) {
    const listUnit = this.currentList.units[unitIndex]
    if (!listUnit) return 0
    const unit = this.getUnitById(listUnit.unitId)
    if (!unit) return 0
    return unit.stats.w * listUnit.modelCount
  },

  getWoundsPerModel(unitIndex) {
    const listUnit = this.currentList.units[unitIndex]
    if (!listUnit) return 1
    const unit = this.getUnitById(listUnit.unitId)
    if (!unit) return 1
    return unit.stats.w
  },

  getModelsAlive(unitIndex) {
    const listUnit = this.currentList.units[unitIndex]
    if (!listUnit) return 0
    const unit = this.getUnitById(listUnit.unitId)
    if (!unit) return 0

    const woundsPerModel = unit.stats.w
    const maxWounds = woundsPerModel * listUnit.modelCount
    const currentWounds = listUnit.currentWounds ?? maxWounds

    if (currentWounds <= 0) return 0
    return Math.ceil(currentWounds / woundsPerModel)
  },

  getCurrentModelWounds(unitIndex) {
    const listUnit = this.currentList.units[unitIndex]
    if (!listUnit) return 0
    const unit = this.getUnitById(listUnit.unitId)
    if (!unit) return 0

    const woundsPerModel = unit.stats.w
    const maxWounds = woundsPerModel * listUnit.modelCount
    const currentWounds = listUnit.currentWounds ?? maxWounds

    if (currentWounds <= 0) return 0

    const remainder = currentWounds % woundsPerModel
    return remainder === 0 ? woundsPerModel : remainder
  },

  adjustWounds(unitIndex, delta) {
    const listUnit = this.currentList.units[unitIndex]
    if (!listUnit) return

    const maxWounds = this.getMaxWounds(unitIndex)
    const currentWounds = listUnit.currentWounds ?? maxWounds

    listUnit.currentWounds = Math.max(0, Math.min(maxWounds, currentWounds + delta))
  },

  getModifiedStat(unitIndex, stat) {
    const listUnit = this.currentList.units[unitIndex]
    if (!listUnit) return '-'

    const unit = this.getUnitById(listUnit.unitId)
    if (!unit) return '-'

    let value = unit.stats[stat]

    const modifiers = this.collectModifiers(unitIndex, stat)

    for (const mod of modifiers) {
      value = this.applyModifier(value, mod)
    }

    if (stat === 'm') {
      return typeof value === 'number' ? value + '"' : value
    }

    return value
  },

  isStatModified(unitIndex, stat) {
    const listUnit = this.currentList.units[unitIndex]
    if (!listUnit) return false

    const unit = this.getUnitById(listUnit.unitId)
    if (!unit) return false

    const baseValue = unit.stats[stat]
    const modifiedValue = this.getModifiedStat(unitIndex, stat)

    if (stat === 'm') {
      return baseValue + '"' !== modifiedValue
    }

    return baseValue !== modifiedValue
  },

  getModifierSources(unitIndex, stat) {
    const sources = []
    const listUnit = this.currentList.units[unitIndex]
    if (!listUnit) return sources

    // Check enhancement modifiers
    if (listUnit.enhancement) {
      const enhancement = this.getEnhancementById(listUnit.enhancement)
      if (enhancement?.modifiers) {
        for (const mod of enhancement.modifiers) {
          if (mod.stat === stat && (mod.scope === 'model' || mod.scope === 'unit')) {
            const sign = mod.operation === 'add' ? '+' : (mod.operation === 'subtract' ? '-' : '')
            sources.push(`${enhancement.name}: ${sign}${mod.value}`)
          }
        }
      }
    }

    // Check weapon modifiers from equipped weapons
    const unit = this.getUnitById(listUnit.unitId)
    if (unit?.weapons) {
      for (const weapon of unit.weapons) {
        if (weapon.modifiers && this.isWeaponEquipped(listUnit, weapon)) {
          for (const mod of weapon.modifiers) {
            if (mod.stat === stat && (mod.scope === 'model' || mod.scope === 'unit')) {
              const sign = mod.operation === 'add' ? '+' : (mod.operation === 'subtract' ? '-' : '')
              const sourceName = mod.source || weapon.name
              sources.push(`${sourceName}: ${sign}${mod.value}`)
            }
          }
        }
      }
    }

    // Check attached leader's enhancement modifiers
    if (listUnit.attachedLeader?.unitIndex !== undefined) {
      const leaderListUnit = this.currentList.units[listUnit.attachedLeader.unitIndex]
      if (leaderListUnit?.enhancement) {
        const leaderEnhancement = this.getEnhancementById(leaderListUnit.enhancement)
        if (leaderEnhancement?.modifiers) {
          for (const mod of leaderEnhancement.modifiers) {
            if (mod.stat === stat && (mod.scope === 'model' || mod.scope === 'unit')) {
              const sign = mod.operation === 'add' ? '+' : (mod.operation === 'subtract' ? '-' : '')
              sources.push(`${leaderEnhancement.name} (Leader): ${sign}${mod.value}`)
            }
          }
        }
      }
    }

    return sources
  },

  getModifiedWeaponStat(unitIndex, weapon, stat) {
    const listUnit = this.currentList.units[unitIndex]
    if (!listUnit) return weapon.stats[stat]

    let value = weapon.stats[stat]

    const modifiers = this.collectWeaponModifiers(unitIndex, weapon, stat)

    for (const mod of modifiers) {
      value = this.applyModifier(value, mod)
    }

    return value
  },

  isWeaponStatModified(unitIndex, weapon, stat) {
    const baseValue = weapon.stats[stat]
    const modifiedValue = this.getModifiedWeaponStat(unitIndex, weapon, stat)
    return baseValue !== modifiedValue
  },

  collectModifiers(unitIndex, stat) {
    const modifiers = []
    const listUnit = this.currentList.units[unitIndex]
    if (!listUnit) return modifiers

    // Collect enhancement modifiers
    if (listUnit.enhancement) {
      const enhancement = this.getEnhancementById(listUnit.enhancement)
      if (enhancement?.modifiers) {
        for (const mod of enhancement.modifiers) {
          if (mod.stat === stat && (mod.scope === 'model' || mod.scope === 'unit')) {
            modifiers.push(mod)
          }
        }
      }
    }

    // Collect weapon modifiers from equipped weapons
    const unit = this.getUnitById(listUnit.unitId)
    if (unit?.weapons) {
      for (const weapon of unit.weapons) {
        if (weapon.modifiers && this.isWeaponEquipped(listUnit, weapon)) {
          for (const mod of weapon.modifiers) {
            if (mod.stat === stat && (mod.scope === 'model' || mod.scope === 'unit')) {
              modifiers.push(mod)
            }
          }
        }
      }
    }

    // Collect modifiers from attached leader's enhancement
    if (listUnit.attachedLeader?.unitIndex !== undefined) {
      const leaderListUnit = this.currentList.units[listUnit.attachedLeader.unitIndex]
      if (leaderListUnit?.enhancement) {
        const leaderEnhancement = this.getEnhancementById(leaderListUnit.enhancement)
        if (leaderEnhancement?.modifiers) {
          for (const mod of leaderEnhancement.modifiers) {
            if (mod.stat === stat && (mod.scope === 'model' || mod.scope === 'unit')) {
              modifiers.push(mod)
            }
          }
        }
      }
    }

    return modifiers
  },

  collectWeaponModifiers(unitIndex, weapon, stat) {
    const modifiers = []
    const listUnit = this.currentList.units[unitIndex]
    if (!listUnit) return modifiers

    for (const stratId of this.gameState.activeStratagems) {
      const strat = this.getStratagemById(stratId)
      if (strat?.modifiers) {
        for (const mod of strat.modifiers) {
          if (mod.stat === stat) {
            if (mod.scope === 'melee' && weapon.type === 'melee') {
              modifiers.push(mod)
            } else if (mod.scope === 'ranged' && weapon.type === 'ranged') {
              modifiers.push(mod)
            } else if (mod.scope === 'all' || mod.scope === 'weapon') {
              modifiers.push(mod)
            }
          }
        }
      }
    }

    return modifiers
  },

  applyModifier(value, mod) {
    if (typeof value !== 'number') {
      return value
    }

    switch (mod.operation) {
      case 'add':
        return value + mod.value
      case 'subtract':
        return value - mod.value
      case 'multiply':
        return value * mod.value
      case 'set':
        return mod.value
      default:
        return value
    }
  },

  async saveList() {
    if (!this.currentList.name.trim()) {
      this.showToast('Please enter a list name', 'error')
      return
    }

    // Validate list before saving
    if (this.listErrors.length > 0) {
      this.showToast(this.listErrors[0], 'error')
      return
    }

    try {
      const response = await fetch('/api.php?action=save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.currentList)
      })
      const result = await response.json()

      if (result.success) {
        this.showToast('List saved successfully', 'success')
        await this.fetchSavedLists()
      } else {
        this.showToast(result.error || 'Failed to save list', 'error')
      }
    } catch (error) {
      console.error('Save error:', error)
      this.showToast('Failed to save list', 'error')
    }
  },

  async fetchSavedLists() {
    try {
      const response = await fetch('/api.php?action=list')
      const result = await response.json()
      this.savedLists = result.lists || []
    } catch (error) {
      console.error('Failed to fetch lists:', error)
    }
  },

  async loadList(filename) {
    try {
      const response = await fetch(`/api.php?action=load&file=${encodeURIComponent(filename)}`)
      const result = await response.json()

      if (result.success) {
        this.currentList = result.data
        if (!this.currentList.activeKatah) {
          this.currentList.activeKatah = ''
        }
        if (!this.currentList.gameFormat) {
          this.currentList.gameFormat = 'standard'
        }
        if (!this.currentList.pointsLimit) {
          this.currentList.pointsLimit = 2000
        }
        this.currentList.units.forEach(unit => {
          if (unit.currentWounds === undefined) {
            unit.currentWounds = null
          }
          if (unit.attachedLeader === undefined) {
            unit.attachedLeader = null
          }
        })
        this.showLoadModal = false
        this.showToast('List loaded successfully', 'success')
      } else {
        this.showToast(result.error || 'Failed to load list', 'error')
      }
    } catch (error) {
      console.error('Load error:', error)
      this.showToast('Failed to load list', 'error')
    }
  },

  async deleteList(filename) {
    if (!confirm('Are you sure you want to delete this list?')) return

    try {
      const response = await fetch(`/api.php?action=delete&file=${encodeURIComponent(filename)}`, {
        method: 'DELETE'
      })
      const result = await response.json()

      if (result.success) {
        this.showToast('List deleted', 'success')
        await this.fetchSavedLists()
      } else {
        this.showToast(result.error || 'Failed to delete list', 'error')
      }
    } catch (error) {
      console.error('Delete error:', error)
      this.showToast('Failed to delete list', 'error')
    }
  },

  importYellowscribe() {
    try {
      const imported = JSON.parse(this.importData)

      if (imported.roster || imported.forces) {
        const roster = imported.roster || imported

        this.currentList = {
          name: roster.name || 'Imported List',
          detachment: this.mapDetachment(roster.detachment || roster.forces?.[0]?.detachment),
          units: this.mapUnits(roster.units || roster.forces?.[0]?.units || []),
          activeKatah: '',
          activeModifiers: []
        }

        this.showImportModal = false
        this.importData = ''
        this.showToast('List imported successfully', 'success')
      } else {
        this.showToast('Invalid import format', 'error')
      }
    } catch (error) {
      console.error('Import error:', error)
      this.showToast('Failed to parse import data', 'error')
    }
  },

  mapDetachment(detachmentName) {
    if (!detachmentName) return 'shield_host'

    const name = detachmentName.toLowerCase()
    if (name.includes('shield') && name.includes('host')) return 'shield_host'
    if (name.includes('talon')) return 'talons_of_the_emperor'
    if (name.includes('null') || name.includes('maiden') || name.includes('vigil')) return 'null_maiden_vigil'
    if (name.includes('auric') || name.includes('champion')) return 'auric_champions'
    if (name.includes('solar') || name.includes('spearhead')) return 'solar_spearhead'
    if (name.includes('lion')) return 'lions_of_the_emperor'

    return 'shield_host'
  },

  mapUnits(importedUnits) {
    return importedUnits.map(imported => {
      const unitName = imported.name || imported.unit || ''
      const matchedUnit = this.data.units?.find(u =>
        u.name.toLowerCase() === unitName.toLowerCase() ||
        u.name.toLowerCase().includes(unitName.toLowerCase()) ||
        unitName.toLowerCase().includes(u.name.toLowerCase())
      )

      if (!matchedUnit) {
        console.warn(`Could not match unit: ${unitName}`)
        return null
      }

      const modelCounts = Object.keys(matchedUnit.points).map(k => parseInt(k))
      const importedCount = imported.modelCount || imported.models || modelCounts[0]
      const validCount = modelCounts.includes(importedCount) ? importedCount : modelCounts[0]

      return {
        unitId: matchedUnit.id,
        modelCount: validCount,
        enhancement: this.mapEnhancement(imported.enhancement || imported.enhancements?.[0]),
        wargear: [],
        currentWounds: null
      }
    }).filter(Boolean)
  },

  mapEnhancement(enhancementName) {
    if (!enhancementName) return ''

    const name = enhancementName.toLowerCase()

    for (const det of Object.values(this.data.detachments || {})) {
      const enh = det.enhancements?.find(e =>
        e.name.toLowerCase() === name ||
        e.name.toLowerCase().includes(name) ||
        name.includes(e.name.toLowerCase())
      )
      if (enh) return enh.id
    }

    return ''
  },

  showToast(message, type = 'success') {
    this.toast = { show: true, message, type }
    setTimeout(() => {
      this.toast.show = false
    }, 3000)
  }
}))

Alpine.start()
