<?php

if (!empty($_SESSION['user'])) {
    echo json_encode(['is_auth' => true]);
} else {
    echo json_encode(['is_auth' => false]);
}
