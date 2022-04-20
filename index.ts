import { on } from '@skyrim-platform/skyrim-platform'
import { Weapon, Form, Game, Shout, Ui, Utility, Spell, Debug, once, printConsole } from 'skyrimPlatform'

const MAX_QUEUE_SIZE = 7;
const skySaCompatibility = true;

const upKey   = 1;
const downKey = 2;
const leftKey = 3;
const rightKey = 4;
const activateKey = 5;
const assignmentModeKey = 6;
const assignLeftKey = 7;
const assignRightKey = 8;
const assignShoutKey = 9;

const indexIDLH = 0
const indexIDRH = 1
const indexIDPower = 2
const indexIDPotion = 3

var isAssignmentMode = false;
var keyDownCode = 0;
var keyDown = false;
var keyDownTime = 999999999.0;
var keyDownMaxTime = 0.8;

var _currQIndices : number[] = new Array(16);
var _shoutQueue : Form[] =     new Array(8);
var _rightHandQueue : Form[] = new Array(8);
var _leftHandQueue : Form[] =  new Array(8);
var _potionQueue : Form[] =    new Array(8);
var _potionQueueSpecialData : number[] = new Array(8);

var minorHPotion : Form = new Form;
var normalHPotion : Form = new Form;
var plentifulHPotion : Form = new Form;
var vigorousHPotion : Form = new Form;
var extremeHPotion : Form = new Form;
var ultimateHPotion : Form = new Form;

var minorMPotion : Form = new Form;
var normalMPotion : Form = new Form;
var plentifulMPotion : Form = new Form;
var vigorousMPotion : Form = new Form;
var extremeMPotion : Form = new Form;
var ultimateMPotion : Form = new Form;

var minorSPotion : Form = new Form;
var normalSPotion : Form = new Form;
var plentifulSPotion : Form = new Form;
var vigorousSPotion : Form = new Form;
var extremeSPotion : Form = new Form;
var ultimateSPotion : Form = new Form;

once('tick', () => {
    printConsole('Hello! You can view this in the Skyrim ~ console on the Main Menu when the game runs')
})

once('update', () => {
    Debug.messageBox('Hello! This will appear when a new game is started or an existing game is loaded');

})

on('buttonEvent', (event) => {
    if(!event.isDown) {
        keyDown = false;
        return;
    }

    const keyCode = event.code;
    saveKeyDownData(event.code);
    //registerForSingleUpdate(0.25);

    if(!Utility.isInMenuMode() && !isRealtimeMenuOpen()) {
        if (keyCode == upKey){
            if(isAssignmentMode) {
                advanceQueue(indexIDPower);
            } else {
                cyclePower();
            }
            // todo: control widget
        } else if(keyCode == downKey) {
            cyclePotion();
            // todo: control widget
        } else if(keyCode == leftKey) {
            if(isAssignmentMode) {
                advanceQueue(indexIDLH);
            } else {
                cycleHand(indexIDLH);
            }
            // todo: control widget
        } else if(keyCode == rightKey) {
            if(isAssignmentMode) {
                advanceQueue(indexIDRH);
            } else {
                cycleHand(indexIDRH);
            }
            // todo: control widget
        } else if(keyCode == activateKey) {
            useEquippedItem();
        } else if(keyCode == assignmentModeKey) {
            isAssignmentMode = !isAssignmentMode;
            // todo: control widget
        } else if(isAssignmentMode) {
            if (keyCode == assignLeftKey){
                assignCurrEquippedItem(indexIDLH);
                // todo: control widget
            } else if(keyCode == assignRightKey) {
                assignCurrEquippedItem(indexIDRH);
                // todo: control widget
            } else if(keyCode == assignShoutKey) {
                assignCurrEquippedItem(indexIDPower);
                // todo: control widget
            }
        }
        // todo: control widget
    }
    printConsole(`${keyCode}`);
})

function isRealtimeMenuOpen(): boolean {
    return Ui.isMenuOpen("Dialogue Menu") || Ui.isMenuOpen("Crafting Menu");
}

function saveKeyDownData(keyCode: number): void {
    keyDownTime = Utility.getCurrentRealTime()
    keyDownCode = keyCode
    keyDown = true
}

function advanceQueue(queueID: number): number {
    var currIndex = _currQIndices[queueID];
    var newIndex = 0;
    if(currIndex < MAX_QUEUE_SIZE - 1) {
        newIndex = currIndex + 1;
    }
    _currQIndices[queueID] = newIndex;
    return newIndex;
}

function cyclePower(): void {
    var currIndex = _currQIndices[indexIDPower];
    var player = Game.getPlayer();
    if(!player) {
        return
    }
    var currShout = player.getEquippedShout();
    if(currShout != _shoutQueue[currIndex] && _shoutQueue[currIndex].getType() != 22) {
        EquipPower(currIndex);
    } else {
		EquipPower(advanceQueueToValidSlot(indexIDPower, 0, false));
    }
}

function cyclePotion(): void {
    advanceQueueToValidSlot(indexIDPotion, 0, false);
    updateItemWidgetCount();
}

function cycleHand(slotID: number): boolean {
	var queue: Form[];
    var equipSlotId: number;
    var currIndex = _currQIndices[slotID];

    var player = Game.getPlayer();
    if(!player) {
        return false;
    }
    
	//for some reason, when using Unequip, 0 corresponds to the left hand, but when using equip, 2 corresponds to the left hand,
	//so we have to change the value for the left hand here	
	if(slotID == indexIDLH){
        queue = _leftHandQueue;
        equipSlotId = 2	;
    } else {
        queue = _rightHandQueue;
        equipSlotId = 1;
    }
	//First, we check to see if the currently equipped item is the same as the current item in the queue.  
	//If it is, advance the queue using CycleHandNext(). Else, equip the current item in the queue
    var currEquippedItem = player.getEquippedObject(slotID);
	var currQItem = queue[currIndex];
	if(currQItem && currEquippedItem != currQItem) {
        if(validateItem(currQItem, true)) {
            unequipHand(slotID);
            if(currQItem.getType() == 22) {
                player.equipSpell(currQItem as Spell, slotID);
                //SkySA Compatibility: Always Dual Wield left hand spell if the right-hand item is two-handed
                if(skySaCompatibility && slotID == indexIDLH) {
                    var queueItemRH = player.getEquippedObject(indexIDRH);
                    if (isCurrentRHQueueItemTwoHanded()) {
                        player.equipSpell(currQItem as Spell, indexIDRH);
                    }
                }
            } else {
				player.equipItemEx(currQItem, equipSlotId, false, false);
                player.queueNiNodeUpdate() ;
            }
			return true;
        } else {
			removeInvalidItem(slotID, currIndex);
        }
		//if item fails validation or curr equipped item check, move to next item in queue
    }
    var initialIndex = currIndex;
	var newIndex = advanceQueueToValidSlot(slotID, 0, false);
    return cycleHandNext(initialIndex, newIndex, slotID, queue, equipSlotId);
}

function isCurrentRHQueueItemTwoHanded(): boolean{
    var currIndex = _currQIndices[indexIDRH];
    var item = _rightHandQueue[currIndex]; //41 is type weapon
    // Two handed weapons are greater than 4
    if (item && item.getType() == 41 && (item as Weapon).getWeaponType() > 4) {
        return true;
    }
    return false;
}

function cycleHandNext(initialIndex: number, newIndex: number, slotID: number, queue: Form[], equipSlotId: number): boolean{
    var player = Game.getPlayer();
    if(!player) {
        return false;
    }
    //Do nothing if the new Queue position is the same as our initial position (was only 1 item in the queue?)
    if (newIndex == initialIndex) {
        return false;
    }
    var nextQItem = queue[newIndex];
	if(validateItem(nextQItem, true)) {
		unequipHand(slotID);
		if(nextQItem.getType() == 22) {
			player.equipSpell(nextQItem as Spell, slotID);

            //SkySA Compatibility: Always Dual Wield left hand spell if the right-hand item is two-handed
            if(skySaCompatibility && slotID == indexIDLH) {
                var currIndex = _currQIndices[slotID];
                var queueItemRH = player.getEquippedObject(indexIDRH);
                if (isCurrentRHQueueItemTwoHanded()) {
                    var currQItem = queue[currIndex];
                    player.equipSpell(currQItem as Spell, indexIDRH);
                }
            }
        } else {
			player.equipItemEx(nextQItem, equipSlotId, false, false);
            player.queueNiNodeUpdate();
        }
		return true;
    } else {
		removeInvalidItem(slotID, newIndex);
    }
    return false;
}

function EquipPower(queueIndex: number): void {
    var type = 0;
    var player = Game.getPlayer();
    if(!player) {
        return
    }
    if(_shoutQueue[queueIndex]) {
        type = _shoutQueue[queueIndex].getType();
    }
    if(type == 22) {
        player.equipSpell(_shoutQueue[queueIndex] as Spell, 2);
    } else if(type == 119) {
        player.equipShout(_shoutQueue[queueIndex] as Shout);
    }
}

function unequipHand(a_hand: number){
    var player = Game.getPlayer();
    if(!player) {
        return
    }
    var a_handEx = 1;
	if (a_hand == 0) {
        a_handEx = 2; //unequipspell and *ItemEx need different hand args
    }

    var handItem = player.getEquippedObject(a_hand);
	if (handItem){
		var itemType = handItem.getType();
		if (itemType == 22) {
			player.unequipSpell(handItem as Spell, a_hand);
        } else {
			player.unequipItemEx(handItem, a_handEx, true);
        }
    }
}

function assignCurrEquippedItem(aiSlot: number) {
    var player = Game.getPlayer();
    if(!player) {
        return
    }
    var obj = player.getEquippedObject(aiSlot);
    var ndx = _currQIndices[aiSlot];
    if(obj) {
        if(aiSlot == 0){
            _leftHandQueue[ndx] = obj;
        } else if(aiSlot == 1){
            _rightHandQueue[ndx] = obj;
        } else if(aiSlot == 2){
            _shoutQueue[ndx] = obj;
        }
    }
}

function removeInvalidItem(queueID: number, index: number) {
    if(queueID == 0) {
        _leftHandQueue[index] = new Form;
    } else if(queueID == 1) {
        _rightHandQueue[index] = new Form;
    } else if(queueID == 2) {
        _shoutQueue[index] = new Form;
    } else if(queueID == 3) {
        _potionQueue[index] = new Form;
    }
}

function advanceQueueToValidSlot(queueID: number, depth: number, allowAlreadyEquipped: boolean): number {
    var newIndex = advanceQueue(queueID);
	// Recursively advance until there is an item in the queue or the entire length of the queue has been traversed
	if(!validateSlot(queueID, allowAlreadyEquipped) && depth < MAX_QUEUE_SIZE - 1){
        newIndex = advanceQueueToValidSlot(queueID, depth + 1, allowAlreadyEquipped)
    }
    return newIndex;
}

function updateItemWidgetCount() {
    var currIndex = _currQIndices[indexIDPotion];
	var item = _potionQueue[currIndex];
    if (item) {
        // todo: update widget
        // SQM.setPotionCount(PlayerRef.GetItemCount(item))
    } else {
        // special exceptions
        var specialDataIndex = _potionQueueSpecialData[currIndex];
        if (specialDataIndex != 0) {
            // todo: update widget
            // SQM.setPotionCount(GetTotalPotions(specialDataIndex))
        }
    }
}

function validateSlot(queueID: number, allowAlreadyEquipped: boolean) {
    var currIndex = _currQIndices[queueID];
    if (queueID == 0) {
        if (_leftHandQueue[currIndex] || !validateItem(_leftHandQueue[currIndex], allowAlreadyEquipped)) {
            return false;
        }
    } else if (queueID == 1) {
        if (_rightHandQueue[currIndex] || !validateItem(_rightHandQueue[currIndex], allowAlreadyEquipped)) {
            return false;
        }
    } else if (queueID == 2) {
        if (_shoutQueue[currIndex] || !validateItem(_shoutQueue[currIndex], allowAlreadyEquipped)) {
            return false;
        }
    } else if (queueID == 3) {
        var specialDataIndex = _potionQueueSpecialData[currIndex];
        if (specialDataIndex != 0 ){
            //Only remove potion groups if we are out of a specified type of potion
            if (getTotalPotions(specialDataIndex) <= 0){
                return false;
            }
        } else if(_potionQueue[currIndex] || !validateItem(_potionQueue[currIndex], allowAlreadyEquipped)) {
            return false
        }
    }
	return true;
}

function validateItem(a_item: Form, allowAlreadyEquipped = false): boolean {
    var player = Game.getPlayer();
    if(!player) {
        return false;
    }
    if(!a_item) {
        return false;
    }
	var a_itemType = a_item.getType();
    var itemCount = 0;
	// This is a Spell or Shout and can't be counted like an item
	if (a_itemType == 22 || a_itemType == 119) {
		return player.hasSpell(a_item);
    } else {
        itemCount = player.getItemCount(a_item);
		if (itemCount < 1) {
			Debug.notification("You no longer have " + a_item.getName());
			return false;
        }
    }

    //This item is already equipped, possibly in the other hand, and there is only 1 of it
	if (!allowAlreadyEquipped
        && ((a_item == player.getEquippedObject(0) || a_item == player.getEquippedObject(1))
        && itemCount < 2) ){
        return false
    }
    return true
}

function useEquippedItem() {
    var player = Game.getPlayer();
    if(!player) {
        return false;
    }
    var currIndex = _currQIndices[indexIDPotion];
    var item = _potionQueue[currIndex];
    if(item != new Form) {
        if(validateItem(item)) {
            player.equipItem(item, false, false);
        } else {
            removeInvalidItem(indexIDPotion, currIndex);
            Debug.notification("You no longer have " + item.getName());
        }
        // todo: update widget
        // SQM.setPotionCount(PlayerRef.GetItemCount(item))
    } else {
        // special exceptions
        var specialDataIndex = _potionQueueSpecialData[currIndex];
        if (specialDataIndex != 0) {
            useSpecialDataPotions(specialDataIndex);
            // todo: update widget
            // SQM.setPotionCount(GetTotalPotions(specialDataIndex));
        }
    }
}

function useSpecialDataPotions(specialDataIndex: number) {
    var player = Game.getPlayer();
    if(!player) {
        return false;
    }
    //Use a potion based on player health [25, 50, 75, 100, 150, FULL]
    if (specialDataIndex == 1) {
        var baseHealth = player.getBaseActorValue("Health");
        var currentHealth = player.getActorValue("Health");
        var missingHealth = baseHealth - currentHealth;
        
        if (missingHealth >= 175 && hasPotion(ultimateHPotion)) {
            player.equipItem(ultimateHPotion, false, false);
        } else if(missingHealth >= 140 && hasPotion(extremeHPotion)) {
            player.equipItem(extremeHPotion, false, false);
        } else if(missingHealth >= 140 && hasPotion(vigorousHPotion)) {
            player.equipItem(vigorousHPotion, false, false);
        } else if(missingHealth >= 140 && hasPotion(plentifulHPotion)) {
            player.equipItem(plentifulHPotion, false, false);
        } else if(missingHealth >= 140 && hasPotion(normalHPotion)) {
            player.equipItem(normalHPotion, false, false);
        } else if(hasPotion(minorHPotion)) {
            player.equipItem(minorHPotion, false, false);
        }
    }else if (specialDataIndex == 2) {
        var baseMagicka = player.getBaseActorValue("Magicka");
        var currentMagicka = player.getActorValue("Magicka");
        var missingMagicka = baseMagicka - currentMagicka;
        
        if (missingMagicka >= 175 && hasPotion(ultimateMPotion)) {
            player.equipItem(ultimateMPotion, false, false);
        } else if(missingMagicka >= 140 && hasPotion(extremeMPotion)) {
            player.equipItem(extremeMPotion, false, false);
        } else if(missingMagicka >= 140 && hasPotion(vigorousMPotion)) {
            player.equipItem(vigorousMPotion, false, false);
        } else if(missingMagicka >= 140 && hasPotion(plentifulMPotion)) {
            player.equipItem(plentifulMPotion, false, false);
        } else if(missingMagicka >= 140 && hasPotion(normalMPotion)) {
            player.equipItem(normalMPotion, false, false);
        } else if(hasPotion(minorMPotion)) {
            player.equipItem(minorMPotion, false, false);
        }
    }else if (specialDataIndex == 3) {
        var baseStamina = player.getBaseActorValue("Stamina");
        var currentStamina = player.getActorValue("Stamina");
        var missingStamina = baseStamina - currentStamina;
        
        if (missingStamina >= 175 && hasPotion(ultimateSPotion)) {
            player.equipItem(ultimateSPotion, false, false);
        } else if(missingStamina >= 140 && hasPotion(extremeSPotion)) {
            player.equipItem(extremeSPotion, false, false);
        } else if(missingStamina >= 140 && hasPotion(vigorousSPotion)) {
            player.equipItem(vigorousSPotion, false, false);
        } else if(missingStamina >= 140 && hasPotion(plentifulSPotion)) {
            player.equipItem(plentifulSPotion, false, false);
        } else if(missingStamina >= 140 && hasPotion(normalSPotion)) {
            player.equipItem(normalSPotion, false, false);
        } else if(hasPotion(minorSPotion)) {
            player.equipItem(minorSPotion, false, false);
        }
    }
}

function getTotalPotions(specialDataIndex: number): number {
    var quantity = 0;
    var player = Game.getPlayer();
    if(!player) {
        return quantity;
    }

    if(specialDataIndex == 1){
        if (minorHPotion != new Form) {
            quantity += 25 * player.getItemCount(minorHPotion);
        }
        if (normalHPotion != new Form) {
            quantity += 50 * player.getItemCount(normalHPotion);
        }
        if (plentifulHPotion != new Form) {
            quantity += 75 * player.getItemCount(plentifulHPotion);
        }
        if (vigorousHPotion != new Form) {
            quantity += 100 * player.getItemCount(vigorousHPotion);
        }
        if (extremeHPotion != new Form) {
            quantity += 150 * player.getItemCount(extremeHPotion);
        }
        if (ultimateHPotion != new Form) {
            quantity += player.getBaseActorValue("Health") * player.getItemCount(ultimateHPotion);
        }
    }else if(specialDataIndex == 2){
        if (minorMPotion != new Form) {
            quantity += 25 * player.getItemCount(minorMPotion);
        }
        if (normalMPotion != new Form) {
            quantity += 50 * player.getItemCount(normalMPotion);
        }
        if (plentifulMPotion != new Form) {
            quantity += 75 * player.getItemCount(plentifulMPotion);
        }
        if (vigorousMPotion != new Form) {
            quantity += 100 * player.getItemCount(vigorousMPotion);
        }
        if (extremeMPotion != new Form) {
            quantity += 150 * player.getItemCount(extremeMPotion);
        }
        if (ultimateMPotion != new Form) {
            quantity += player.getBaseActorValue("Magicka") * player.getItemCount(ultimateMPotion);
        }
    }else if(specialDataIndex == 3){
        if (minorSPotion != new Form) {
            quantity += 25 * player.getItemCount(minorSPotion);
        }
        if (normalSPotion != new Form) {
            quantity += 50 * player.getItemCount(normalSPotion);
        }
        if (plentifulSPotion != new Form) {
            quantity += 75 * player.getItemCount(plentifulSPotion);
        }
        if (vigorousSPotion != new Form) {
            quantity += 100 * player.getItemCount(vigorousSPotion);
        }
        if (extremeSPotion != new Form) {
            quantity += 150 * player.getItemCount(extremeSPotion);
        }
        if (ultimateSPotion != new Form) {
            quantity += player.getBaseActorValue("Stamina") * player.getItemCount(ultimateSPotion);
        }
    }
    return quantity;
}

function hasPotion(kPotion: Form) {
    var player = Game.getPlayer();
    if(!player) {
        return false;
    }
    if (kPotion == new Form || player.getItemCount(kPotion) <= 0) {
        return false;
    }
    return true;
}
