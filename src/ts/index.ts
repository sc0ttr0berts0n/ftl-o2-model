const rooms = document.querySelectorAll('.room');
const doors = document.querySelectorAll('.door');

// set click handlers on doors
doors.forEach((door: HTMLDivElement, index) => {
    const _toggleDoorOpenState = (e: MouseEvent) => {
        e.stopPropagation();
        const tgt = e.currentTarget as HTMLDivElement;
        if (!tgt.dataset.open || tgt.dataset.open === 'false') {
            tgt.dataset.open = 'true';
        } else {
            tgt.dataset.open = 'false';
        }
    };
    door.addEventListener('click', _toggleDoorOpenState);
    door.dataset.id = index.toString();
});

// set up click handlers on rooms
rooms.forEach((room: HTMLDivElement) => {
    const _toggleBreachState = (e: MouseEvent) => {
        e.stopPropagation();
        const tgt = e.currentTarget as HTMLDivElement;
        if (!tgt.dataset.breach || tgt.dataset.breach === 'false') {
            tgt.dataset.breach = 'true';
        } else {
            tgt.dataset.breach = 'false';
        }
    };
    room.addEventListener('click', _toggleBreachState);

    room.dataset.o2 = '0';
});

// the model for a door
// room = the HTML Room Element
// door = the HTML Door Element
// space flag = true/false of whever this via accesses space if open
// joins shows connecting rooms the via connects
interface Via {
    room: HTMLDivElement;
    door: HTMLDivElement;
    spaceFlag: boolean;
    joins: Room['id'][];
}

// the model for the room
// id = numeric string id
// el = HTML Room Element
// o2 = float of o2 in room
// o2DeltaRegister = how much the o2 changes this time step
// o2El = o2 visual HTML element
// vias = list of doors attached to this room
interface Room {
    id: string;
    el: HTMLDivElement;
    o2: number;
    pressureAcc: number;
    o2El: HTMLDivElement;
    vias: Via[];
}

// create a ship object, holding an array of all rooms,
// with all of the vias in the room
const ship = Array.from(rooms).map((room: HTMLDivElement) => {
    const vias: Via[] = Array.from(doors)
        .filter((door: HTMLDivElement) => {
            return door.dataset.joins.split(':').includes(room.dataset.id);
        })
        .map((door: HTMLDivElement) => {
            const joins = door.dataset.joins.split(':');
            return {
                room: room,
                door: door,
                spaceFlag: joins[1] === 'space',
                joins: joins,
            };
        });
    const data: Room = {
        id: room.dataset.id,
        el: room,
        o2: 0.8,
        pressureAcc: 0,
        o2El: room.querySelector('.o2-overlay'),
        vias: vias,
    };
    return data;
});

// call this every frame to simulate the flow of oxygen in each room
const flowOxygen = (ship: Room[]) => {
    const DRAIN_RATE = 0.03;
    const FILL_RATE = 0.012 / 60;
    const FLOW_FACTOR = 0.03;

    // For each room in the ship, run the following:
    ship.forEach((room: Room) => {
        // if breached, draw out air
        if (room.el.dataset.breach === 'true') {
            room.pressureAcc -= DRAIN_RATE;
        }

        // if exposed to space, draw out air
        const _isRoomExposedToSpace = (via: Via): boolean =>
            via.spaceFlag && via.door.dataset.open === 'true';
        if (room.vias.find(_isRoomExposedToSpace)) {
            room.pressureAcc -= DRAIN_RATE;
        }

        // average rooms exposed to each other
        room.vias
            // filter to only open rooms
            .filter((via) => {
                return via.door.dataset.open === 'true';
            })
            // for each room with open via
            .forEach((via) => {
                // get the neighbor, aka outflow room
                const outflowRoom: Room = ship[parseInt(via.joins[1])];
                // if outflow room is not connected to space
                if (outflowRoom) {
                    // calc the delta between two rooms
                    const deltaPressure = room.o2 - outflowRoom.o2;

                    // give or receive pressure between the rooms
                    room.pressureAcc -= deltaPressure * FLOW_FACTOR;
                    outflowRoom.pressureAcc += deltaPressure * FLOW_FACTOR;
                }
            });

        // add o2 to every room, if they have positive pressure
        if (room.pressureAcc >= 0) {
            room.pressureAcc += FILL_RATE;
        }
    });

    ship.forEach((room: Room) => {
        // apply delta degister values to room
        room.o2 += room.pressureAcc;

        // zero delta for next tick
        room.pressureAcc = 0;

        // clamp all o2 to 0,1
        room.o2 = Math.min(Math.max(0, room.o2), 1);

        // render o2 state in UI
        room.el.dataset.o2 = room.o2.toFixed(2).toString();
        room.o2El.style.opacity = (1 - room.o2).toString();
        room.el.querySelector('.o2-value').textContent = room.o2.toFixed(2);
    });
    requestAnimationFrame(() => flowOxygen(ship));
};

requestAnimationFrame(() => flowOxygen(ship));
