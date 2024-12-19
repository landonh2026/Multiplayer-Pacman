/**
 * Represents a remote player
 */
class RemotePlayer {
    /** The session id for this remote player */
    session: string;

    /** The pacman object for this remote player */
    pacman: Pacman;

    /**
     * Create a new RemotePlayer given a session string and a pacman object
     * @param session 
     * @param pacman 
     */
    constructor(session: string, pacman: Pacman) {
        this.session = session;
        this.pacman = pacman;
    }
}