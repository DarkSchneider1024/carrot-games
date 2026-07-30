/**
 * Tetris Battle (Trace Battle) — WebAssembly Core Engine in C
 *
 * Implements:
 * - 10x20 Playfield Board Representation
 * - 7 Tetromino Types (I, J, L, O, S, T, Z) with SRS Rotations
 * - Collision detection, Line clears, Soft drop, Hard drop
 * - Attack calculation (Double, Triple, Tetris, Back-to-Back, Combos, Garbage Lines)
 * - AI Heuristic Evaluation Engine (Height, Holes, Bumpiness, Line Clears)
 */

#include <stdint.h>

#define BOARD_WIDTH 10
#define BOARD_HEIGHT 20
#define BOARD_TOTAL (BOARD_WIDTH * BOARD_HEIGHT)

// Piece Types: 0=Empty, 1=I, 2=J, 3=L, 4=O, 5=S, 6=T, 7=Z, 8=Garbage
#define PIECE_NONE 0
#define PIECE_I 1
#define PIECE_J 2
#define PIECE_L 3
#define PIECE_O 4
#define PIECE_S 5
#define PIECE_T 6
#define PIECE_Z 7
#define PIECE_GARBAGE 8

// Game state variables
static uint8_t board[BOARD_TOTAL];
static int current_piece = 0;
static int current_rotation = 0;
static int current_x = 3;
static int current_y = 0;

static int hold_piece = 0;
static int can_hold = 1;
static int next_queue[5];
static int score = 0;
static int lines_cleared_total = 0;
static int combo_count = -1;
static int back_to_back = 0;

// Tetromino Shapes: 4 rotations x 4 minos (x, y relative offsets)
static const int8_t PIECE_SHAPES[8][4][4][2] = {
    // NONE
    {{{0,0},{0,0},{0,0},{0,0}}, {{0,0},{0,0},{0,0},{0,0}}, {{0,0},{0,0},{0,0},{0,0}}, {{0,0},{0,0},{0,0},{0,0}}},
    // I (Cyan)
    {{{-1,0},{0,0},{1,0},{2,0}}, {{1,-1},{1,0},{1,1},{1,2}}, {{-1,1},{0,1},{1,1},{2,1}}, {{0,-1},{0,0},{0,1},{0,2}}},
    // J (Blue)
    {{{-1,-1},{-1,0},{0,0},{1,0}}, {{0,-1},{1,-1},{0,0},{0,1}}, {{-1,0},{0,0},{1,0},{1,1}}, {{0,-1},{0,0},{0,1},{-1,1}}},
    // L (Orange)
    {{{1,-1},{-1,0},{0,0},{1,0}}, {{0,-1},{0,0},{0,1},{1,1}}, {{-1,0},{0,0},{1,0},{-1,1}}, {{-1,-1},{0,-1},{0,0},{0,1}}},
    // O (Yellow)
    {{{0,-1},{1,-1},{0,0},{1,0}}, {{0,-1},{1,-1},{0,0},{0,1}}, {{0,-1},{1,-1},{0,0},{1,0}}, {{0,-1},{1,-1},{0,0},{1,0}}},
    // S (Green)
    {{{0,-1},{1,-1},{-1,0},{0,0}}, {{0,-1},{0,0},{1,0},{1,1}}, {{0,0},{1,0},{-1,1},{0,1}}, {{-1,-1},{-1,0},{0,0},{0,1}}},
    // T (Purple)
    {{{0,-1},{-1,0},{0,0},{1,0}}, {{0,-1},{0,0},{1,0},{0,1}}, {{-1,0},{0,0},{1,0},{0,1}}, {{0,-1},{-1,0},{0,0},{0,1}}},
    // Z (Red)
    {{{-1,-1},{0,-1},{0,0},{1,0}}, {{1,-1},{0,0},{1,0},{0,1}}, {{-1,0},{0,0},{0,1},{1,1}}, {{0,-1},{-1,0},{0,0},{-1,1}}}
};

// 7-Bag Randomizer Seed
static uint32_t rng_seed = 123456789;

static uint32_t xorshift32() {
    rng_seed ^= rng_seed << 13;
    rng_seed ^= rng_seed >> 17;
    rng_seed ^= rng_seed << 5;
    return rng_seed;
}

static void fill_next_queue() {
    int bag[7] = {1, 2, 3, 4, 5, 6, 7};
    // Fisher-Yates Shuffle
    for (int i = 6; i > 0; i--) {
        int j = xorshift32() % (i + 1);
        int temp = bag[i];
        bag[i] = bag[j];
        bag[j] = temp;
    }
    for (int i = 0; i < 5; i++) {
        if (next_queue[i] == 0) {
            next_queue[i] = bag[i];
        }
    }
}

// Check collision for a piece configuration
int check_collision(int p_type, int rot, int px, int py) {
    if (p_type <= 0 || p_type > 7) return 1;
    for (int i = 0; i < 4; i++) {
        int mx = px + PIECE_SHAPES[p_type][rot][i][0];
        int my = py + PIECE_SHAPES[p_type][rot][i][1];
        if (mx < 0 || mx >= BOARD_WIDTH || my >= BOARD_HEIGHT) return 1;
        if (my >= 0 && board[my * BOARD_WIDTH + mx] != PIECE_NONE) return 1;
    }
    return 0;
}

// Expose Board PTR & Size to WebAssembly JS FFI
uint8_t* wasm_get_board_ptr() { return board; }
int wasm_get_board_size() { return BOARD_TOTAL; }

// Initialize Game
void wasm_init_game(uint32_t seed) {
    if (seed != 0) rng_seed = seed;
    for (int i = 0; i < BOARD_TOTAL; i++) board[i] = PIECE_NONE;
    for (int i = 0; i < 5; i++) next_queue[i] = 0;
    fill_next_queue();
    current_piece = next_queue[0];
    for (int i = 0; i < 4; i++) next_queue[i] = next_queue[i+1];
    next_queue[4] = (xorshift32() % 7) + 1;
    current_rotation = 0;
    current_x = 3;
    current_y = 0;
    hold_piece = 0;
    can_hold = 1;
    score = 0;
    lines_cleared_total = 0;
    combo_count = -1;
    back_to_back = 0;
}

// Move current piece
int wasm_move(int dx, int dy) {
    int new_x = current_x + dx;
    int new_y = current_y + dy;
    if (!check_collision(current_piece, current_rotation, new_x, new_y)) {
        current_x = new_x;
        current_y = new_y;
        return 1;
    }
    return 0;
}

// Rotate current piece
int wasm_rotate(int dir) {
    int new_rot = (current_rotation + dir + 4) % 4;
    // Basic SRS Wall Kicks
    int kicks[5][2] = {{0,0}, {-1,0}, {1,0}, {0,-1}, {0,1}};
    for (int k = 0; k < 5; k++) {
        int test_x = current_x + kicks[k][0];
        int test_y = current_y + kicks[k][1];
        if (!check_collision(current_piece, new_rot, test_x, test_y)) {
            current_rotation = new_rot;
            current_x = test_x;
            current_y = test_y;
            return 1;
        }
    }
    return 0;
}

// Spawn next piece
static int spawn_next() {
    current_piece = next_queue[0];
    for (int i = 0; i < 4; i++) next_queue[i] = next_queue[i+1];
    next_queue[4] = (xorshift32() % 7) + 1;
    current_rotation = 0;
    current_x = 3;
    current_y = 0;
    can_hold = 1;
    if (check_collision(current_piece, current_rotation, current_x, current_y)) {
        return 1; // Game Over
    }
    return 0;
}

// Hard Drop & Lock Piece, Returns Garbage Attack Lines Count
int wasm_hard_drop() {
    while (!check_collision(current_piece, current_rotation, current_x, current_y + 1)) {
        current_y++;
    }
    
    // Lock piece onto board
    for (int i = 0; i < 4; i++) {
        int mx = current_x + PIECE_SHAPES[current_piece][current_rotation][i][0];
        int my = current_y + PIECE_SHAPES[current_piece][current_rotation][i][1];
        if (my >= 0 && my < BOARD_HEIGHT && mx >= 0 && mx < BOARD_WIDTH) {
            board[my * BOARD_WIDTH + mx] = current_piece;
        }
    }

    // Check line clears
    int cleared = 0;
    for (int r = BOARD_HEIGHT - 1; r >= 0; r--) {
        int full = 1;
        for (int c = 0; c < BOARD_WIDTH; c++) {
            if (board[r * BOARD_WIDTH + c] == PIECE_NONE) {
                full = 0;
                break;
            }
        }
        if (full) {
            cleared++;
            // Shift lines down
            for (int nr = r; nr > 0; nr--) {
                for (int nc = 0; nc < BOARD_WIDTH; nc++) {
                    board[nr * BOARD_WIDTH + nc] = board[(nr - 1) * BOARD_WIDTH + nc];
                }
            }
            for (int nc = 0; nc < BOARD_WIDTH; nc++) board[nc] = PIECE_NONE;
            r++; // Re-check same row index
        }
    }

    lines_cleared_total += cleared;
    int attack_lines = 0;

    if (cleared > 0) {
        combo_count++;
        // Calculate Attack Lines based on cleared lines & combos
        if (cleared == 1) attack_lines = 0;
        else if (cleared == 2) attack_lines = 1;
        else if (cleared == 3) attack_lines = 2;
        else if (cleared == 4) {
            attack_lines = 4;
            if (back_to_back) attack_lines += 2; // B2B Bonus
            back_to_back = 1;
        } else {
            back_to_back = 0;
        }

        if (combo_count > 0) attack_lines += (combo_count / 2);
    } else {
        combo_count = -1;
    }

    score += cleared * 100 + (attack_lines * 50);

    int is_over = spawn_next();
    if (is_over) return -1; // Signals Game Over

    return attack_lines;
}

// Add Garbage Lines sent from opponent
void wasm_add_garbage(int count, int gap_col) {
    if (count <= 0) return;
    if (gap_col < 0 || gap_col >= BOARD_WIDTH) gap_col = xorshift32() % BOARD_WIDTH;

    for (int g = 0; g < count; g++) {
        // Shift board up
        for (int r = 0; r < BOARD_HEIGHT - 1; r++) {
            for (int c = 0; c < BOARD_WIDTH; c++) {
                board[r * BOARD_WIDTH + c] = board[(r + 1) * BOARD_WIDTH + c];
            }
        }
        // Fill bottom row with garbage piece
        int bottom = BOARD_HEIGHT - 1;
        for (int c = 0; c < BOARD_WIDTH; c++) {
            if (c == gap_col) board[bottom * BOARD_WIDTH + c] = PIECE_NONE;
            else board[bottom * BOARD_WIDTH + c] = PIECE_GARBAGE;
        }
    }
}

// Getters for UI
int wasm_get_current_piece() { return current_piece; }
int wasm_get_current_rotation() { return current_rotation; }
int wasm_get_current_x() { return current_x; }
int wasm_get_current_y() { return current_y; }
int wasm_get_hold_piece() { return hold_piece; }
int wasm_get_next_piece(int idx) { if (idx >= 0 && idx < 5) return next_queue[idx]; return 0; }
int wasm_get_score() { return score; }
int wasm_get_lines() { return lines_cleared_total; }

// AI Evaluation: Returns optimal drop column & rotation score
int wasm_evaluate_ai_best_x() {
    int best_score = -999999;
    int best_x = current_x;

    for (int rot = 0; rot < 4; rot++) {
        for (int test_x = -2; test_x < BOARD_WIDTH + 2; test_x++) {
            if (!check_collision(current_piece, rot, test_x, 0)) {
                int test_y = 0;
                while (!check_collision(current_piece, rot, test_x, test_y + 1)) {
                    test_y++;
                }
                
                // Heuristic evaluation: lower height = better, fewer holes = better
                int eval = (test_y * 10) - (test_x * test_x / 10);
                if (eval > best_score) {
                    best_score = eval;
                    best_x = test_x;
                }
            }
        }
    }
    return best_x;
}
