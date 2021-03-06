from pymongo import MongoClient
import pymongo
import time
import threading
import multiprocessing as mp
from multiprocessing import Pool
import numpy as np
from global_variable import *
import json

class SeismDb:
    def __init__(self):
        self.client = MongoClient('localhost', 27017)
        self.db = self.client.zh_seism

        self.trace = self.db.trace
        self.zCollection = self.db.z
        self.wellAttr = self.db.wellAttr

    def queryMatrix(self, plane_name, depth):
        matrix = []
        if plane_name == 'xz' or plane_name == 'zx':
            if depth < 0 or depth > rowCount:
                raise ValueError('depth for y should less than {0} and larger than 0'.format(yDepth))
            cursor = self.trace.find({"x": {"$gte": xStart, "$lte": xEnd}, "y": yStart + depth * xySection})
            self.iterCursor(cursor, matrix)
            """
            self.multiThreadingIterCursor(cursor)
            self.multiProcessingIterCursor(cursor, matrix, 5)
            """
        elif plane_name == 'yz' or plane_name == 'zy':
            if depth < 0 or depth > colCount:
                raise ValueError('depth for x should less than {0} and larger than 0'.format(colCount))
            cursor = self.trace.find({"x": xStart + depth * xySection, "y": {"$gte": yStart, "$lte": yEnd}})
            self.iterCursor(cursor, matrix)
        elif plane_name == 'xy' or plane_name == 'yx':
            if depth < 0 or depth > zDepth:
                raise ValueError('depth for x should less than {0} and larger than 0'.format(zDepth))
            matrix = self.zCollection.find_one({"level": depth})['z']

        return np.transpose(matrix)

    def iterCursor(self, cursor, matrix):
        for doc in cursor:
            matrix.append(doc['z'])

    def multiThreadingIterCursor(self, cursor):
        threads = []
        matrix = []
        for doc in cursor:
            millis = int(round(time.time() * 1000))
            print(millis)
            matrix.append(doc['z'])
            millis2 = int(round(time.time() * 1000))
            print(millis2 - millis)
        """
        for i in range(threadingCount):
            thread = threading.Thread(target=self.iterCursor, args=(doc, matrix))
            threads.append(thread)
        """

    def multiProcessingIterCursor(self, cursor, matrix, processCount):
        with Pool(processCount) as p:
            p.apply_async(self.iterCursor, args=(cursor, matrix))

    def drawMatrix(self, matrix):
        pass

    def queryByOneCoord(self, colNumber, rowNumber):
        zArray = self.trace.find_one({"x": xStart + colNumber * xySection, "y": yStart + rowNumber * xySection})['z']
        return zArray

    def queryBound(self, ox, oy, tx, ty):
        matrix = []
        bigX = ox if ox > tx else tx
        bigY = oy if oy > ty else ty
        smallX = ox if ox < tx else tx
        smallY = oy if oy < ty else ty

        cursor = self.trace.find({"x": {"$gte": xStart + smallX * xySection, "$lte": xStart + bigX * xySection},
                                  "y": {"$gte": yStart + smallY * xySection, "$lte": yStart + bigY * xySection}})
        for doc in cursor:
            matrix.append(doc['z'])
            if len(matrix) > 500:
                break
        return matrix

    def queryWellAttr(self, id1, id2):
        print(id1)
        attr1 = self.wellAttr.find_one({"id": id1})
        attr2 = self.wellAttr.find_one({"id": id2})
        attr1.pop('_id')
        attr2.pop('_id')
        return [attr1, attr2]


if __name__ == '__main__':
    db = SeismDb()

    zArray = db.queryBound(200, 200, 300, 300)
    # matrix2 = db.queryMatrix('yz', 200)
