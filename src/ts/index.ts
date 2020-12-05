const rooms = document.querySelectorAll('.room');
const doors = document.querySelectorAll('.door');

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

interface Via {
    room: HTMLDivElement;
    door: HTMLDivElement;
    spaceFlag: boolean;
}

interface RoomData {
    id: string;
    el: HTMLDivElement;
    o2: number;
    o2DeltaRegister: number;
    o2El: HTMLDivElement;
    vias: Via[];
}

const ship = Array.from(rooms).map((room: HTMLDivElement) => {
    const vias: Via[] = Array.from(doors)
        .filter((door: HTMLDivElement) => {
            return door.dataset.joins.split(':').includes(room.dataset.id);
        })
        .map((door: HTMLDivElement) => {
            return {
                room: room,
                door: door,
                spaceFlag: door.dataset.joins.split(':')[1] === 'space',
            };
        });
    const data: RoomData = {
        id: room.dataset.id,
        el: room,
        o2: 0.8,
        o2DeltaRegister: 0,
        o2El: room.querySelector('.o2-overlay'),
        vias: vias,
    };
    return data;
});

const flowOxygen = (ship: RoomData[]) => {
    const drainRate = 0.03;
    const fillRate = 0.012 / 60;
    const viaFactor = 0.03;

    ship.forEach((room: RoomData) => {
        // if breached, draw out air
        if (room.el.dataset.breach === 'true') {
            room.o2DeltaRegister -= drainRate;
        }

        // if exposed to space, draw out air
        if (
            room.vias.find(
                (via) => via.spaceFlag && via.door.dataset.open === 'true'
            )
        ) {
            room.o2DeltaRegister -= drainRate;
        }

        // average rooms exposed to each other
        room.vias
            .filter((via) => {
                return via.door.dataset.open === 'true';
            })
            .forEach((via) => {
                const outflowRoom: RoomData =
                    ship[parseInt(via.door.dataset.joins.split(':')[1])];
                if (outflowRoom) {
                    const delta = room.o2 - outflowRoom.o2;
                    room.o2DeltaRegister -= delta * viaFactor;
                    outflowRoom.o2DeltaRegister += delta * viaFactor;
                }
            });

        // add o2 to every room
        if (room.o2DeltaRegister >= 0) {
            room.o2DeltaRegister += fillRate;
        }
    });

    ship.forEach((room: RoomData) => {
        // apply delta
        room.o2 += room.o2DeltaRegister;
        room.o2DeltaRegister = 0;

        // render o2 state
        room.o2 = Math.min(Math.max(0, room.o2), 1);
        room.el.dataset.o2 = room.o2.toFixed(2).toString();
        room.o2El.style.opacity = (1 - room.o2).toString();
        room.el.querySelector('.o2-value').textContent = room.o2.toFixed(2);
    });
    requestAnimationFrame(() => flowOxygen(ship));
};

requestAnimationFrame(() => flowOxygen(ship));
