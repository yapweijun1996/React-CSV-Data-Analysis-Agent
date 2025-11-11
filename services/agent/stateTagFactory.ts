export class StateTagFactory {
    private seq = 0;
    private lastEpoch = 0;

    mint(now: number = Date.now(), _hint?: string): string {
        const epoch = now > this.lastEpoch ? now : this.lastEpoch;
        if (epoch !== this.lastEpoch) {
            this.seq = 0;
            this.lastEpoch = epoch;
        }
        this.seq += 1;
        const paddedEpoch = epoch.toString().padStart(13, '0');
        return `${paddedEpoch}-${this.seq}`;
    }
}

export const createStateTagGenerator = (): (() => string) => {
    const factory = new StateTagFactory();
    return () => factory.mint();
};
