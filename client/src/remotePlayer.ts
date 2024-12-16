class RemotePlayer {
    session: string;
    pacman: Pacman;

    constructor(session: string, pacman: Pacman) {
        this.session = session;
        this.pacman = pacman;
    }
}